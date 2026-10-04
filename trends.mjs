import Parser from 'rss-parser';
import { cfg } from './config.mjs';
const parser=new Parser();
function clean(s){return s.replace(/\s+/g,' ').trim();}
export async function discoverTopics(){
  const out=[];
  const feeds=[
    'https://news.google.com/rss/search?q=Pakistan&hl=en-PK&gl=PK&ceid=PK:en',
    'https://news.google.com/rss/search?q=Pakistan%20breaking%20news&hl=en-PK&gl=PK&ceid=PK:en',
    'https://news.google.com/rss/search?q=Pakistan%20trending&hl=en-PK&gl=PK&ceid=PK:en'
  ];
  for(const url of feeds){try{const f=await parser.parseURL(url);for(const x of (f.items||[]).slice(0,15)) out.push({title:clean(x.title||''),link:x.link||'',published:x.pubDate||'',source:x.creator||f.title||'Google News'});}catch(e){console.warn('RSS failed',e.message)}}
  if(cfg.youtubeApiKey){try{const u=new URL('https://www.googleapis.com/youtube/v3/videos');u.search=new URLSearchParams({part:'snippet,statistics',chart:'mostPopular',regionCode:'PK',maxResults:'25',key:cfg.youtubeApiKey});const r=await fetch(u);if(r.ok){const d=await r.json();for(const x of d.items||[])out.push({title:x.snippet?.title||'',link:`https://www.youtube.com/watch?v=${x.id}`,published:x.snippet?.publishedAt||'',source:'YouTube Pakistan trending'});}}catch(e){console.warn('YouTube trends failed',e.message)}}
  const seen=new Set(); return out.filter(x=>x.title&&!seen.has(x.title.toLowerCase())&&seen.add(x.title.toLowerCase())).slice(0,60);
}
