# Zero Lag Moments V6 — GitHub Actions setup

This V6 package is adapted for GitHub Actions. GitHub Actions is an ephemeral runner, so it runs **one production job at a time** instead of keeping a Node process alive 24/7.

## How scheduling works

The workflow checks every 15 minutes. PostgreSQL stores `worker_state.next_run`, and the worker only runs when that timestamp is due. After a run it schedules the next run 90 minutes later.

This avoids pretending that a GitHub Actions job is a permanent server.

## Required GitHub Actions secrets

Create these under **Settings → Secrets and variables → Actions → Secrets**:

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `YOUTUBE_API_KEY`
- `NETLIFY_API_URL`
- `WORKER_API_SECRET`

`NETLIFY_API_URL` should be:

`https://zerolagmomentagent.netlify.app/.netlify/functions/worker-connection`

`WORKER_API_SECRET` must be the exact same random value configured in Netlify as `WORKER_API_SECRET`.

## Optional GitHub Actions variables

Under **Settings → Secrets and variables → Actions → Variables**:

- `AUTO_PUBLISH` = `false` initially
- `GEMINI_TEXT_MODEL` = `gemini-2.5-flash`
- `GEMINI_IMAGE_MODEL` = `gemini-3.1-flash-image`
- `ELEVENLABS_MODEL_ID` = `eleven_flash_v2_5`

Set `AUTO_PUBLISH=true` only after a successful end-to-end test and after confirming the YouTube channel is connected.

## Local test

From the `worker` directory:

```bash
npm install
cp .env.example .env
npm run once
```

FFmpeg must be installed locally for rendering.

## Security

Never commit `.env`, OAuth JSON files, refresh tokens, API keys, passwords, or Supabase service-role keys.
