import { json } from './_lib.mjs';
import { getDashboardState, closeDb } from './_db.mjs';

export default async () => {
  try {
    const d = await getDashboardState();
    return json({
      online: true,
      running: !!d.running,
      workerId: d.worker_id || 'github-actions-worker',
      lastHeartbeat: d.last_heartbeat || null,
      nextRun: d.next_run || null,
      lastRun: d.last_run || null,
      automationEnabled: d.automation_enabled !== false,
      topics: d.topics || [],
      jobs: d.jobs || [],
      serverTime: new Date().toISOString()
    });
  } catch (e) {
    return json({ online: false, error: e.message || 'Database unavailable.' }, { status: 503 });
  } finally { await closeDb().catch(() => {}); }
};
