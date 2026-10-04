import fs from 'node:fs/promises';
import path from 'node:path';
import { cfg } from './config.mjs';
const file=()=>path.join(cfg.dataDir,'state.json');
export async function readState(){try{return JSON.parse(await fs.readFile(file(),'utf8'));}catch{return {topics:[],jobs:[],lastRun:null};}}
export async function writeState(s){await fs.mkdir(cfg.dataDir,{recursive:true});await fs.writeFile(file(),JSON.stringify(s,null,2));}
export async function addJob(job){const s=await readState();s.jobs.push(job);await writeState(s);return job;}
