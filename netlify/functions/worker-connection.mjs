import { json, loadConnection } from './_lib.mjs';
export default async (req) => {
  const expected = process.env.WORKER_API_SECRET || '';
  const supplied = req.headers.get('x-worker-secret') || '';
  if (!expected || supplied !== expected) return json({error:'Unauthorized'}, {status:401});
  if (req.method !== 'GET') return json({error:'Method not allowed'}, {status:405});
  const c = await loadConnection();
  if (!c) return json({connected:false});
  return json({connected:true, ...c});
};
