import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {cfg} from './config.mjs';
const exec=promisify(execFile);
export async function duration(file){const {stdout}=await exec(cfg.ffprobe,['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',file]);return Number(stdout.trim());}
export async function render({images,audio,outFile,vertical=true}){
  const dir=path.dirname(outFile);await fs.mkdir(dir,{recursive:true});
  const d=await duration(audio);const per=d/images.length;const list=path.join(dir,'images.txt');
  const lines=[];for(const im of images)lines.push(`file '${path.resolve(im).replaceAll("'","'\\''")}'`,`duration ${per.toFixed(3)}`);lines.push(`file '${path.resolve(images.at(-1)).replaceAll("'","'\\''")}'`);await fs.writeFile(list,lines.join('\n'));
  const vf=vertical?'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,format=yuv420p':'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,format=yuv420p';
  await exec(cfg.ffmpeg,['-y','-f','concat','-safe','0','-i',list,'-i',audio,'-vf',vf,'-r','30','-c:v','libx264','-preset','veryfast','-crf','23','-c:a','aac','-shortest',outFile],{maxBuffer:1024*1024*10});return outFile;
}
export async function makeSrt(script,audio,outFile){const d=await duration(audio);const parts=script.match(/[^.!?]+[.!?]+|.+$/g)?.map(x=>x.trim()).filter(Boolean)||[script];const total=parts.reduce((a,x)=>a+x.length,0)||1;let t=0;const ts=s=>{const ms=Math.round(s*1000),h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),sec=Math.floor(ms%60000/1000),mm=ms%1000;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')},${String(mm).padStart(3,'0')}`};let out='';parts.forEach((p,i)=>{const dur=d*(p.length/total);out+=`${i+1}\n${ts(t)} --> ${ts(Math.min(d,t+dur))}\n${p}\n\n`;t+=dur;});await fs.writeFile(outFile,out);return outFile;}
