import { cfg } from './config.mjs';
import { initDb, getState, setRunState, setSchedule, touchHeartbeat, closeDb } from './db.mjs';
import { runPipeline } from './pipeline.mjs';

const nextRun = () => new Date(Date.now() + cfg.scheduleMinutes * 60_000);

async function main() {
  await initDb();
  const state = await getState();

  if (state.automation_enabled === false) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'automation-paused' }));
    return;
  }

  if (state.next_run && new Date(state.next_run) > new Date()) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'not-due', nextRun: state.next_run }));
    return;
  }

  const runId = `run-${Date.now()}`;
  await setRunState({ running: true, currentJobId: runId });
  await touchHeartbeat({ running: true, currentJobId: runId });

  try {
    const result = await runPipeline({ runId, reason: 'github-actions' });
    await setRunState({ running: false, currentJobId: null, lastRun: new Date() });
    await setSchedule(nextRun());
    console.log(JSON.stringify({ ok: true, result, nextRun: nextRun().toISOString() }));
  } catch (error) {
    await setRunState({ running: false, currentJobId: null, lastRun: new Date() });
    await setSchedule(nextRun());
    console.error(error?.stack || error);
    process.exitCode = 1;
  } finally {
    await touchHeartbeat({ running: false, currentJobId: null }).catch(() => {});
  }
}

main()
  .catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb().catch(() => {});
  });
