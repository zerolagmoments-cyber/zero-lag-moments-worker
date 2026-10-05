import fs from 'node:fs/promises';
import { cfg } from './config.mjs';
export async function makeVoice(text,outFile){
  if(!cfg.elevenKey||!cfg.elevenVoice) throw new Error('Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID');
  const r=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${cfg.elevenVoice}`,{method:'POST',headers:{'xi-api-key':cfg.elevenKey,'Content-Type':'application/json','Accept':'audio/mpeg'},body:JSON.stringify({text,model_id:cfg.elevenModel,output_format:'mp3_44100_128'})});
  if(!r.ok) throw new Error(`ElevenLabs ${r.status}: ${await r.text()}`); await fs.writeFile(outFile,Buffer.from(await r.arrayBuffer())); return outFile;
}
