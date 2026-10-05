import fs from 'node:fs/promises';
import path from 'node:path';
import { cfg } from './config.mjs';

async function call(body){
  if(!cfg.geminiKey) throw new Error('GEMINI_API_KEY is required');
  const r=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{
    method:'POST',
    headers:{'x-goog-api-key':cfg.geminiKey,'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  const text=await r.text();
  if(!r.ok) throw new Error(`Gemini ${r.status}: ${text.slice(0,1000)}`);
  return JSON.parse(text);
}
function textOf(d){
  if(typeof d.output_text==='string') return d.output_text;
  return (d.output||[]).filter(x=>x.type==='text').map(x=>x.text||'').join('');
}
function parseJsonText(t){
  const clean=t.replace(/^\s*```(?:json)?\s*/i,'').replace(/\s*```\s*$/,'').trim();
  return JSON.parse(clean);
}
export async function generateJson(prompt){
  const d=await call({model:cfg.geminiTextModel,input:prompt});
  return parseJsonText(textOf(d));
}
export async function generateText(prompt){
  const d=await call({model:cfg.geminiTextModel,input:prompt});
  return textOf(d).trim();
}
export async function generateImage(prompt,outFile,aspectRatio='9:16'){
  const d=await call({
    model:cfg.geminiImageModel,
    input:[{type:'text',text:prompt}],
    response_format:{type:'image',mime_type:'image/png',aspect_ratio:aspectRatio,image_size:'1K'}
  });
  const img=d.output_image?.data;
  if(!img) throw new Error('Gemini returned no image');
  await fs.mkdir(path.dirname(outFile),{recursive:true});
  await fs.writeFile(outFile,Buffer.from(img,'base64'));
  return outFile;
}
