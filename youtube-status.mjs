import { json, loadConnection } from './_lib.mjs';

// The dashboard should show the saved OAuth connection immediately. We do not
// call YouTube on every 10-second dashboard refresh; the worker/upload path is
// responsible for detecting a revoked token and asking for reconnection.
export default async () => {
  try {
    const c = await loadConnection();
    if (!c?.refreshToken) return json({ connected:false, message:'YouTube is not connected.' });
    return json({
      connected:true,
      channelId:c.channelId || null,
      channelName:c.channelName || 'YouTube channel',
      connectedAt:c.connectedAt || null,
      source:'saved_oauth_connection'
    });
  } catch (err) {
    console.error('youtube-status:', err);
    return json({ connected:false, message:'A saved YouTube connection exists but could not be read. Check TOKEN_ENCRYPTION_KEY; if you changed it after connecting, reconnect once.', errorCode:'TOKEN_READ_ERROR' }, { status: 200 });
  }
};
