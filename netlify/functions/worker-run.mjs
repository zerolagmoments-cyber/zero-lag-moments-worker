import { json } from './_lib.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
  const token = process.env.GITHUB_TOKEN || '';
  const repo = process.env.GITHUB_REPO || '';
  const workflow = process.env.GITHUB_WORKFLOW || 'zero-lag-worker.yml';
  const ref = process.env.GITHUB_REF || 'main';
  if (!token || !repo) return json({ error: 'GitHub Actions is not configured in Netlify environment variables.' }, { status: 503 });
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ ref, inputs: { force: 'true' } })
    });
    if (!r.ok) return json({ error: `GitHub workflow dispatch failed (${r.status}).`, detail: await r.text() }, { status: 502 });
    return json({ ok: true, message: 'GitHub Actions worker dispatched.' });
  } catch (e) {
    return json({ error: e.message || 'Could not dispatch GitHub Actions.' }, { status: 502 });
  }
};
