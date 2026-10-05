import { createHmac, timingSafeEqual } from 'node:crypto';
import { google } from 'googleapis';
import { makeSessionCookie, cookieMap, json, saveConnection } from './_lib.mjs';

const html = (title, msg, cookie = '') => new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font:16px system-ui;background:#0b1020;color:#eef3ff;padding:10vh 8vw"><h1>${title}</h1><p>${msg}</p><a style="color:#70e1c1" href="/">Return to dashboard</a></body></html>`, {
  headers: { 'Content-Type': 'text/html; charset=utf-8', ...(cookie ? { 'Set-Cookie': cookie } : {}) }
});

export default async (req) => {
  const e = process.env;
  if (!e.GOOGLE_CLIENT_ID || !e.GOOGLE_CLIENT_SECRET || !e.OAUTH_STATE_SECRET) return html('Setup required', 'Set the OAuth environment variables in Netlify.');
  const u = new URL(req.url), state = u.searchParams.get('state') || '', code = u.searchParams.get('code');
  if (u.searchParams.get('error')) return html('Authorization cancelled', 'You did not authorize the connection.');
  const cookies = cookieMap(req), cookie = cookies.zl_oauth_state || '';
  const parts = state.split('.'), cp = cookie.split('.');
  const sig = v => createHmac('sha256', e.OAUTH_STATE_SECRET).update(v || '').digest('hex');
  const eq = (a,b) => { const x=Buffer.from(a), y=Buffer.from(b); return x.length===y.length && timingSafeEqual(x,y); };
  if (!code || parts[0] !== cp[0] || !parts[1] || !eq(parts[1],sig(parts[0])) || !cp[1] || !eq(cp[1],sig(cp[0]))) return html('Could not verify connection', 'OAuth state check failed. Return to the dashboard and retry.');
  try {
    const redirect = e.GOOGLE_REDIRECT_URI || 'https://zerolagmomentagent.netlify.app/.netlify/functions/oauth-callback';
    const auth = new google.auth.OAuth2(e.GOOGLE_CLIENT_ID, e.GOOGLE_CLIENT_SECRET, redirect);
    const { tokens } = await auth.getToken(code);
    auth.setCredentials(tokens);
    const yt = google.youtube({ version:'v3', auth });
    const r = await yt.channels.list({ part:['snippet'], mine:true });
    const item = r.data.items?.[0];
    if (!item) return html('No YouTube channel found', 'Google authorization succeeded, but this Google account does not have an accessible YouTube channel.');
    if (!tokens.refresh_token) return html('Reconnect required', 'Google did not return a refresh token. Start the connection again so the agent can stay connected.');
    await saveConnection({
      channelId: item.id,
      channelName: item.snippet?.title || 'YouTube channel',
      refreshToken: tokens.refresh_token,
      connectedAt: new Date().toISOString()
    });
    const session = makeSessionCookie();
    return html('YouTube connected', `Google successfully authorized channel: ${item.snippet?.title || 'YouTube channel'}. The encrypted connection is now stored, and the dashboard can show its connection status.`, `zl_session=${session}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`);
  } catch (err) {
    console.error(err);
    return html('YouTube connection failed', 'Check YouTube Data API v3, consent-screen setup, the exact redirect URI, and Netlify function logs.');
  }
};
