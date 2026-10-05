import { createHmac, randomBytes } from 'node:crypto';

export default async () => {
  const { GOOGLE_CLIENT_ID, OAUTH_STATE_SECRET } = process.env;
  if (!GOOGLE_CLIENT_ID || !OAUTH_STATE_SECRET) return new Response('Set GOOGLE_CLIENT_ID and OAUTH_STATE_SECRET in Netlify environment variables.', { status: 500 });
  const state = randomBytes(24).toString('hex');
  const sig = createHmac('sha256', OAUTH_STATE_SECRET).update(state).digest('hex');
  const redirect = process.env.GOOGLE_REDIRECT_URI || 'https://zerolagmomentagent.netlify.app/.netlify/functions/oauth-callback';
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  u.searchParams.set('redirect_uri', redirect);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload');
  u.searchParams.set('access_type', 'offline');
  u.searchParams.set('prompt', 'consent');
  u.searchParams.set('state', `${state}.${sig}`);
  return new Response(null, { status: 302, headers: {
    Location: u.toString(),
    'Set-Cookie': `zl_oauth_state=${state}.${sig}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
  }});
};
