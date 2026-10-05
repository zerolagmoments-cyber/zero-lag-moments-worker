# Zero Lag Moments — V6 GitHub Worker

Production-oriented automation worker for the **Zero Lag Moments** YouTube channel.

## What this V6 package contains

- Netlify dashboard and Google OAuth 2.0 integration
- Supabase PostgreSQL state and job history
- GitHub Actions production runner
- 90-minute database-backed scheduling
- Manual GitHub Actions `workflow_dispatch`
- Pakistan trending-topic discovery via RSS and YouTube Pakistan popular videos
- Roman Urdu script generation
- AI metadata generation
- AI image generation
- ElevenLabs voice generation
- FFmpeg video rendering
- SRT caption generation
- YouTube upload through the OAuth refresh token stored by the Netlify dashboard
- Worker heartbeat and job history

## Important architecture note

GitHub Actions is **not** a permanent 24/7 Node server. This version runs one job when due, stores durable state in PostgreSQL, and exits. The workflow checks every 15 minutes while PostgreSQL enforces the real 90-minute cadence.

## Repository safety

Never commit:

- `.env`
- Google OAuth client JSON
- YouTube refresh/access tokens
- Supabase passwords or service-role keys
- Gemini API keys
- ElevenLabs API keys

Use GitHub Actions encrypted Secrets instead.

## Daily targets

- 10 Shorts/day
- 1 long-form video/day
- PKT (UTC+5)

The worker prioritizes Shorts until the daily Short target is reached, then produces the long-form target.

## Publishing safety

`AUTO_PUBLISH` defaults to `false`. Keep it false until the complete pipeline has been tested. Set it to true only after verifying the generated output and YouTube OAuth connection.

## Current rendering limitation

GitHub-hosted runners are temporary. Generated files are available only during the job unless uploaded as artifacts. Automatic YouTube publishing should therefore happen in the same job as rendering.

## Setup

See `worker/SETUP-GITHUB.md`. The Netlify dashboard dispatches the GitHub Actions workflow for Run Now and reads worker/job state from PostgreSQL.
