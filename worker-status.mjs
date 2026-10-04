import { json } from './_lib.mjs';
export default async () => {
  const url=(process.env.WORKER_API_URL||'').replace(/\/$/,''); const secret=process.env.WORKER_API_SECRET||'';
  if(!url) return json({error:'Worker is not configured in Netlify environment variables.'},{status:503});
  try{const r=await fetch(`${url}/status`,{headers:{'x-worker-secret':secret}}); const d=await r.json(); if(!r.ok)return json({error:d.error||'Worker returned an error.'},{status:r.status});
    return json({online:true,running:!!d.running,workerId:d.worker_id||d.workerId||null,lastHeartbeat:d.last_heartbeat||d.lastHeartbeat||null,nextRun:d.next_run||d.nextRun||null,lastRun:d.last_run||d.lastRun||null,automationEnabled:d.automation_enabled!==false,topics:d.topics||[],jobs:d.jobs||[],serverTime:d.serverTime});
  }catch(e){return json({online:false,error:'Worker is unreachable.'},{status:502});}
};
