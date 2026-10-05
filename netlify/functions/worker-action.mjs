import { json } from './_lib.mjs';
import { setAutomation, closeDb } from './_db.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
  const action = new URL(req.url).searchParams.get('action');
  if (!['pause', 'resume'].includes(action)) return json({ error: 'Use ?action=pause or ?action=resume' }, { status: 400 });
  try {
    await setAutomation(action === 'resume');
    return json({ ok: true, message: action === 'resume' ? 'Automation resumed.' : 'Automation paused.' });
  } catch (e) {
    return json({ error: e.message || 'Could not update automation state.' }, { status: 503 });
  } finally { await closeDb().catch(() => {}); }
};
