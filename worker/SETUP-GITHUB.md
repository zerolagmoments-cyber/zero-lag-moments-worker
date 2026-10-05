# Zero Lag Moments V6 — GitHub Actions setup

This version uses GitHub Actions as the ephemeral media worker and Supabase PostgreSQL as durable state. Netlify is the dashboard/OAuth control plane.

## Scheduling

GitHub Actions checks every 15 minutes. PostgreSQL stores `worker_state.next_run`, and the worker runs only when that timestamp is due. After a run it schedules the next run 90 minutes later.

The dashboard's **Run Next Video Now** button dispatches the GitHub workflow with `force=true`.

## Required GitHub Actions secrets

Create these under **Settings → Secrets and variables → Actions → Secrets**:

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `YOUTUBE_API_KEY`
- `NETLIFY_API_URL` = `https://zerolagmomentagent.netlify.app/.netlify/functions/worker-connection`
- `WORKER_API_SECRET` (must match Netlify's value; used by the worker when retrieving the encrypted YouTube connection)

## Optional GitHub Actions variables

Under **Settings → Secrets and variables → Actions → Variables**:

- `AUTO_PUBLISH` = `false` initially
- `GEMINI_TEXT_MODEL` = `gemini-2.5-flash`
- `GEMINI_IMAGE_MODEL` = `gemini-3.1-flash-image`
- `ELEVENLABS_MODEL_ID` = `eleven_flash_v2_5`

Set `AUTO_PUBLISH=true` only after a successful end-to-end test.

## Required Netlify environment variables for this architecture

- `DATABASE_URL`
- `GITHUB_TOKEN` — GitHub token allowed to dispatch workflows in the repository
- `GITHUB_REPO` — `zerolagmoments-cyber/zero-lag-moments-worker`
- `GITHUB_WORKFLOW` — `zero-lag-worker.yml`
- `GITHUB_REF` — `main`
- `WORKER_API_SECRET`
- Google OAuth variables from the main README

## Security

Never commit `.env`, Google OAuth client JSON, refresh tokens, Supabase passwords/service-role keys, Gemini keys, ElevenLabs keys, or GitHub tokens.
