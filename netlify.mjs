import { cfg } from './config.mjs';
export async function getYouTubeConnection(){
  if(!cfg.netlifyApiUrl||!cfg.workerSecret) return null;
  const r=await fetch(cfg.netlifyApiUrl,{headers:{'x-worker-secret':cfg.workerSecret}});
  if(!r.ok) throw new Error(`Netlify connection endpoint returned ${r.status}`);
  const d=await r.json(); return d.connected?d:null;
}
