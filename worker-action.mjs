import { json } from './_lib.mjs';
export default async (req) => {
  if(req.method!=='POST') return json({error:'Method not allowed'},{status:405});
  const action=new URL(req.url).searchParams.get('action');
  const url=(process.env.WORKER_API_URL||'').replace(/\/$/,''); const secret=process.env.WORKER_API_SECRET||'';
  if(!url||!secret) return json({error:'Worker is not configured.'},{status:503});
  if(!['pause','resume'].includes(action)) return json({error:'Use ?action=pause or ?action=resume'},{status:400});
  try{const r=await fetch(`${url}/automation/${action}`,{method:'POST',headers:{'x-worker-secret':secret}}); const d=await r.json(); return json(d,{status:r.status});}
  catch(e){return json({error:'Worker is unreachable.'},{status:502});}
};
