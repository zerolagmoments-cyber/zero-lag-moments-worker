import pg from 'pg';
const { Pool } = pg;
let pool;
const databaseUrl = () => process.env.DATABASE_URL || '';
export const db = () => {
  if (!databaseUrl()) throw new Error('DATABASE_URL is not configured in Netlify.');
  if (!pool) pool = new Pool({ connectionString: databaseUrl(), ssl: { rejectUnauthorized: false }, max: 3 });
  return pool;
};
export async function initDb() {
  const p = db();
  await p.query(`CREATE TABLE IF NOT EXISTS worker_state (id integer primary key, worker_id text not null, last_heartbeat timestamptz, running boolean default false, current_job_id text, last_run timestamptz, next_run timestamptz, automation_enabled boolean default true, updated_at timestamptz default now());`);
  await p.query(`CREATE TABLE IF NOT EXISTS jobs (id text primary key, type text not null, topic text, status text not null, error text, youtube_video_id text, meta jsonb, created_at timestamptz default now(), started_at timestamptz, finished_at timestamptz);`);
  await p.query(`CREATE TABLE IF NOT EXISTS topics (id bigserial primary key, title text not null, reason text, source_links jsonb, discovered_at timestamptz default now());`);
  await p.query(`INSERT INTO worker_state(id,worker_id,automation_enabled) VALUES(1,'github-actions-worker',true) ON CONFLICT(id) DO NOTHING`);
}
export async function getDashboardState() {
  await initDb();
  const p = db();
  const s = (await p.query(`SELECT * FROM worker_state WHERE id=1`)).rows[0];
  const jobs = (await p.query(`SELECT id,type,topic,status,error,youtube_video_id as "youtubeVideoId",meta,created_at as "createdAt",started_at as "startedAt",finished_at as "finishedAt" FROM jobs ORDER BY created_at DESC LIMIT 50`)).rows;
  const topics = (await p.query(`SELECT title,reason,source_links as "sourceLinks",discovered_at as "discoveredAt" FROM topics ORDER BY discovered_at DESC LIMIT 60`)).rows;
  return { ...s, jobs, topics };
}
export async function setAutomation(enabled) {
  await initDb();
  await db().query(`UPDATE worker_state SET automation_enabled=$1,updated_at=now() WHERE id=1`, [enabled]);
}
export async function closeDb() { if (pool) await pool.end(); pool = null; }
