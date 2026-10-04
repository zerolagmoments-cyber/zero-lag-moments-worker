import { json } from './_lib.mjs';
export default async (req) => {
  if(req.method!=='POST') return json({error:'Method not allowed'},{status:405});
  const url=(process.env.WORKER_API_URL||'').replace(/\/$/,''); const secret=process.env.WORKER_API_SECRET||'';
  if(!url||!secret) return json({error:'Worker is not configured in Netlify environment variables.'},{status:503});
  try{const r=await fetch(`${url}/run`,{method:'POST',headers:{'x-worker-secret':secret,'content-type':'application/json'}}); const d=await r.json(); return json(d,{status:r.status});}
  catch(e){return json({error:'Worker is unreachable.'},{status:502});}
};
