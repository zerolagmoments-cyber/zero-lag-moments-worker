# Mac quick setup

1. Open VS Code Terminal in this `worker` folder.
2. `npm install`
3. `cp .env.example .env`
4. Open `.env` and add your keys.
5. Install FFmpeg if you don't have it: `brew install ffmpeg`
6. Connect YouTube from the Netlify dashboard first.
7. Keep `AUTO_PUBLISH=false`.
8. Run `npm run once`.
9. Look in `worker/output/` for the generated MP4.

Do not paste API keys or secrets into chat.
