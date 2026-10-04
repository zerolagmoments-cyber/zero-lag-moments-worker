import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

export const json = (data, init = {}) => new Response(JSON.stringify(data), {
  ...init,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...(init.headers || {}) }
});

export const cookieMap = (req) => Object.fromEntries((req.headers.get('cookie') || '')
  .split(';').map(x => x.trim()).filter(Boolean).map(x => {
    const i = x.indexOf('='); return [x.slice(0, i), x.slice(i + 1)];
  }));

const secret = () => process.env.OAUTH_STATE_SECRET || '';
const encryptionKey = () => createHash('sha256').update(process.env.TOKEN_ENCRYPTION_KEY || secret()).digest();
const sign = (value) => createHmac('sha256', secret()).update(value).digest('hex');

export const makeSessionCookie = () => {
  const id = randomBytes(24).toString('hex');
  return `${id}.${sign(id)}`;
};

export const validSession = (req) => {
  const raw = cookieMap(req).zl_session || '';
  const [id, mac] = raw.split('.');
  if (!id || !mac || !secret()) return false;
  const expected = sign(id);
  const a = Buffer.from(mac), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const store = () => getStore({ name: 'zero-lag-youtube' });

export const saveConnection = async (connection) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(connection), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  await store().set('connection', JSON.stringify({
    v: 1,
    iv: iv.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
    data: ciphertext.toString('base64url')
  }));
};

export const loadConnection = async () => {
  const raw = await store().get('connection');
  if (!raw) return null;
  const box = JSON.parse(raw);
  const decryptWith = (key) => {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(box.tag, 'base64url'));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(box.data, 'base64url')), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8'));
  };
  try {
    return decryptWith(encryptionKey());
  } catch (firstError) {
    // Backward compatibility: connections saved before TOKEN_ENCRYPTION_KEY
    // was added were encrypted with OAUTH_STATE_SECRET.
    if (process.env.TOKEN_ENCRYPTION_KEY && secret()) {
      try { return decryptWith(createHash('sha256').update(secret()).digest()); }
      catch { throw firstError; }
    }
    throw firstError;
  }
};

export const clearConnection = async () => store().delete('connection');

export const requireConfig = () => {
  const e = process.env;
  const missing = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OAUTH_STATE_SECRET'].filter(k => !e[k]);
  if (missing.length) throw new Error(`Missing Netlify environment variables: ${missing.join(', ')}`);
};
