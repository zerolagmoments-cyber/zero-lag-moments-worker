import path from 'node:path';
import fs from 'node:fs/promises';
import {cfg} from './config.mjs';
import {discoverTopics} from './trends.mjs';
import {generateJson,generateText,generateImage} from './gemini.mjs';
import {makeVoice} from './voice.mjs';
import {render,makeSrt} from './render.mjs';
import {getYouTubeConnection} from './netlify.mjs';
import {uploadVideo} from './youtube.mjs';
import {insertJob,finishJob,saveTopics,dailyCounts} from './db.mjs';
import {researchTopic} from './research.mjs';

async function chooseTopic(){
  const raw=await discoverTopics(); if(!raw.length) throw new Error('No topics discovered');
  const selected=await generateJson(`You are the neutral editorial planner for Pakistan YouTube channel Zero Lag Moments. From these current candidate headlines choose ONE timely topic supported by sources. Avoid hate, harassment, graphic material and partisan persuasion. For politics/current affairs remain neutral and factual. Return JSON only: {"title":"...","reason":"...","sourceLinks":["..."]}. Candidates: ${JSON.stringify(raw)}`);
  const topic=Array.isArray(selected)?selected[0]:selected; if(!topic?.title) throw new Error('Topic selector returned no topic'); await saveTopics([topic]); return topic;
}

async function makeVideo({topic,type,connection,jobId,research}){
  const dir=path.join(cfg.outputDir,jobId); await fs.mkdir(dir,{recursive:true});
  const isLong=type==='long';
  const script=await generateText(isLong
    ? `Write a 6-12 minute YouTube explainer script in natural Pakistani Roman Urdu about this topic: ${topic.title}. Use only claims supported by this research dossier. Source URLs are included for attribution. Research dossier: ${JSON.stringify(research)}. Remain neutral and factual, explain context and competing factual viewpoints where relevant, never invent quotes, allegations or statistics, and do not use Urdu/Arabic script. Include clear section transitions. Return only narration.`
    : `Write a 20-60 second YouTube Short narration in natural Pakistani Roman Urdu about this topic: ${topic.title}. Use only claims supported by this research dossier. Source URLs are included for attribution. Research dossier: ${JSON.stringify(research)}. Be neutral and factual. No Urdu/Arabic script, no invented quotes, no speculation. Start with a concise hook and end with a neutral takeaway. Return only narration.`);
  const meta=await generateJson(`Create YouTube metadata for this Roman Urdu ${isLong?'long-form explainer':'Short'}. Topic: ${topic.title}\nScript: ${script}\nSource URLs: ${JSON.stringify(topic.sourceLinks||[])}\nReturn JSON only: {"title":"<=${isLong?100:70} chars","description":"factual description including source links and an AI disclosure","tags":["..."],"thumbnailPrompt":"${isLong?'16:9':'16:9'} editorial thumbnail prompt, no copyrighted logos, minimal readable text"}`);
  await insertJob({id:jobId,type,topic:topic.title,status:'rendering',meta});
  const voice=await makeVoice(script,path.join(dir,'voice.mp3'));
  const sceneCount=isLong?cfg.scenesLong:cfg.scenesShort; const images=[];
  for(let s=0;s<sceneCount;s++) images.push(await generateImage(`Create a realistic editorial visual for a Pakistani news/trending explainer. Topic: ${topic.title}. Scene ${s+1} of ${sceneCount}. Do not depict a real person as making a statement or action unless supported by the source. No fake logos, no gore, no text. ${isLong?'16:9':'vertical 9:16'} composition.`,path.join(dir,`scene-${s+1}.png`),isLong?'16:9':'9:16'));
  const thumbnail=await generateImage(`Create a clean 16:9 YouTube thumbnail for this Pakistan trending-topic explainer: ${topic.title}. Editorial, high contrast, original imagery, no copyrighted logos, no fake quotes, no misleading claims. Keep any text minimal and legible.`,path.join(dir,'thumbnail.png'),'16:9');
  const video=await render({images,audio:voice,outFile:path.join(dir,'video.mp4'),vertical:!isLong});
  const srt=await makeSrt(script,voice,path.join(dir,'captions.srt'));
  let upload=null; if(connection&&cfg.autoPublish) upload=await uploadVideo({connection,file:video,thumbnail,title:meta.title,description:meta.description,tags:meta.tags,privacyStatus:'public'});
  await finishJob(jobId,{status:upload?'uploaded':'ready',youtubeVideoId:upload?.id||null,meta});
  return {jobId,type,topic:topic.title,status:upload?'uploaded':'ready',youtubeVideoId:upload?.id||null,video,srt};
}

export async function runPipeline({runId,reason='scheduled'}={}){
  await fs.mkdir(cfg.outputDir,{recursive:true});
  if(!cfg.geminiKey) throw new Error('GEMINI_API_KEY is required');
  const counts=await dailyCounts();
  if((counts.short||0)>=cfg.shortsPerDay && (counts.long||0)>=cfg.longsPerDay) return {skipped:true,reason:'daily-target-reached',counts};
  const type=(counts.short||0)<cfg.shortsPerDay ? 'short' : 'long';
  const topic=await chooseTopic();
  const research=await researchTopic(topic);
  if(!research.length) throw new Error('Could not retrieve any source pages for fact-checking.');
  const jobId=runId||`${type}-${Date.now()}`;
  await insertJob({id:jobId,type,topic:topic.title,status:'started'});
  try{
    const connection=await getYouTubeConnection();
    if(cfg.autoPublish && !connection) throw new Error('YouTube is not connected; refusing automatic publish.');
    return await makeVideo({topic,type,connection,jobId,research});
  }catch(e){await finishJob(jobId,{status:'failed',error:e.message});throw e;}
}
