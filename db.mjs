import pg from 'pg';
import { cfg } from './config.mjs';
const { Pool } = pg;
let pool;
export function db(){
  if(!cfg.databaseUrl) throw new Error('DATABASE_URL is required for V6.');
  if(!pool) pool=new Pool({connectionString:cfg.databaseUrl,ssl:cfg.databaseSsl?{rejectUnauthorized:false}:false,max:5});
  return pool;
}
export async function initDb(){
  const p=db();
  await p.query(`CREATE TABLE IF NOT EXISTS worker_state (id integer primary key, worker_id text not null, last_heartbeat timestamptz, running boolean default false, current_job_id text, last_run timestamptz, next_run timestamptz, automation_enabled boolean default true, updated_at timestamptz default now());`);
  await p.query(`CREATE TABLE IF NOT EXISTS jobs (id text primary key, type text not null, topic text, status text not null, error text, youtube_video_id text, meta jsonb, created_at timestamptz default now(), started_at timestamptz, finished_at timestamptz);`);
  await p.query(`CREATE TABLE IF NOT EXISTS topics (id bigserial primary key, title text not null, reason text, source_links jsonb, discovered_at timestamptz default now());`);
  await p.query(`INSERT INTO worker_state(id,worker_id,automation_enabled) VALUES(1,$1,true) ON CONFLICT(id) DO NOTHING`,[cfg.workerId]);
}
export async function touchHeartbeat({running=false,currentJobId=null}={}){await db().query(`UPDATE worker_state SET worker_id=$1,last_heartbeat=now(),running=$2,current_job_id=$3,updated_at=now() WHERE id=1`,[cfg.workerId,running,currentJobId]);}
export async function setSchedule(nextRun){await db().query(`UPDATE worker_state SET next_run=$1,updated_at=now() WHERE id=1`,[nextRun]);}
export async function setRunState({running,currentJobId=null,lastRun=null}){await db().query(`UPDATE worker_state SET running=$1,current_job_id=$2,last_run=COALESCE($3,last_run),last_heartbeat=now(),updated_at=now() WHERE id=1`,[running,currentJobId,lastRun]);}
export async function getState(){const s=(await db().query('SELECT * FROM worker_state WHERE id=1')).rows[0]; const jobs=(await db().query('SELECT id,type,topic,status,error,youtube_video_id as "youtubeVideoId",meta,created_at as "createdAt",started_at as "startedAt",finished_at as "finishedAt" FROM jobs ORDER BY created_at DESC LIMIT 50')).rows; const topics=(await db().query('SELECT title,reason,source_links as "sourceLinks",discovered_at as "discoveredAt" FROM topics ORDER BY discovered_at DESC LIMIT 60')).rows; return {...s,jobs,topics};}
export async function insertJob(j){await db().query(`INSERT INTO jobs(id,type,topic,status,meta,started_at) VALUES($1,$2,$3,$4,$5,now()) ON CONFLICT(id) DO UPDATE SET status=EXCLUDED.status,meta=EXCLUDED.meta,started_at=COALESCE(jobs.started_at,EXCLUDED.started_at)`,[j.id,j.type,j.topic||null,j.status||'queued',j.meta?JSON.stringify(j.meta):null]);}
export async function finishJob(id,{status,error=null,youtubeVideoId=null,meta=null}={}){await db().query(`UPDATE jobs SET status=$2,error=$3,youtube_video_id=COALESCE($4,youtube_video_id),meta=COALESCE($5,meta),finished_at=now() WHERE id=$1`,[id,status,error,youtubeVideoId,meta?JSON.stringify(meta):null]);}
export async function saveTopics(items){for(const x of items) await db().query(`INSERT INTO topics(title,reason,source_links) VALUES($1,$2,$3)`,[x.title,x.reason||null,JSON.stringify(x.sourceLinks||[])]);}
export async function dailyCounts(){const r=await db().query(`SELECT type,COUNT(*)::int AS count FROM jobs WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Karachi') AT TIME ZONE 'Asia/Karachi' AND status IN ('ready','uploaded') GROUP BY type`); return Object.fromEntries(r.rows.map(x=>[x.type,x.count]));}
export async function closeDb(){if(pool) await pool.end();}
