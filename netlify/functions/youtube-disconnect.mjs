import { json, clearConnection } from './_lib.mjs';
import { validSession } from './_lib.mjs';
export default async (req) => {
  if (!validSession(req)) return json({error:'Not authorized'}, {status:401});
  await clearConnection();
  return json({ok:true,connected:false});
};
