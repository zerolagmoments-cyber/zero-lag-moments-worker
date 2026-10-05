import express from 'express';
import { cfg } from './config.mjs';
import { runPipeline } from './pipeline.mjs';
import { initDb, getState, touchHeartbeat, setSchedule, setRunState } from './db.mjs';

const app = express();
app.use(express.json());
let running = false;

const auth = (req, res, next) => {
  if (!cfg.workerSecret || req.headers['x-worker-secret'] !== cfg.workerSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
const nextRun = () => new Date(Date.now() + cfg.scheduleMinutes * 60_000);

async function execute(reason = 'scheduled') {
  if (running) return { started: false, reason: 'already-running' };
  running = true;
  const jobId = `run-${Date.now()}`;
  await setRunState({ running: true, currentJobId: jobId });
  await touchHeartbeat({ running: true, currentJobId: jobId });
  try {
    const result = await runPipeline({ runId: jobId, reason });
    await setRunState({ running: false, currentJobId: null, lastRun: new Date() });
    await setSchedule(nextRun());
    return { started: true, result };
  } catch (e) {
    await setRunState({ running: false, currentJobId: null, lastRun: new Date() });
    await setSchedule(nextRun());
    throw e;
  } finally {
    running = false;
    await touchHeartbeat({ running: false, currentJobId: null }).catch(() => {});
  }
}

app.get('/health', async (_req, res) => res.json({
  ok: true,
  service: 'zero-lag-moments-worker-v6',
  mode: 'legacy-continuous-worker',
  time: new Date().toISOString(),
  running
}));

app.get('/status', auth, async (_req, res) => {
  try {
    const s = await getState();
    res.json({ ...s, running, online: true, serverTime: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ error: e.message });
  }
});

app.post('/run', auth, async (_req, res) => {
  if (running) return res.status(409).json({ ok: false, error: 'A pipeline run is already in progress.' });
  execute('manual').then(x => console.log('manual run finished', x)).catch(e => console.error('manual run failed', e));
  res.status(202).json({ ok: true, started: true, message: 'Pipeline started in background.' });
});

app.post('/automation/pause', auth, async (_req, res) => {
  await setSchedule(null);
  await touchHeartbeat({ running });
  res.json({ ok: true, enabled: false });
});

app.post('/automation/resume', auth, async (_req, res) => {
  await setSchedule(new Date());
  await touchHeartbeat({ running });
  res.json({ ok: true, enabled: true });
});

app.listen(cfg.port, async () => {
  try {
    await initDb();
    await touchHeartbeat({ running });
    const st = await getState();
    if (!st.next_run) await setSchedule(new Date());
    console.log(`V6 worker listening on ${cfg.port}`);
  } catch (e) {
    console.error('Database initialization failed:', e);
    process.exit(1);
  }
});

setInterval(async () => {
  try {
    await touchHeartbeat({ running });
    const s = await getState();
    if (!running && s.automation_enabled !== false && s.next_run && new Date(s.next_run) <= new Date()) {
      await execute('scheduled');
    }
    if (!running && !s.next_run && s.automation_enabled !== false) await setSchedule(new Date());
  } catch (e) {
    console.error('scheduler/heartbeat error', e.message);
  }
}, 15_000);
