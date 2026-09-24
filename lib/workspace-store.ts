import { env } from 'cloudflare:workers';
import { initialData } from './domain';

export type WorkspaceRow={payload:string;version:number};
const redisKey='fiscaliza:workspace';

function redisCredentials(){
 const url=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL;
 const token=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN;
 return url&&token?{url:url.replace(/\/$/,''),token}:null;
}

async function redisCommand<T>(command:unknown[]):Promise<T>{
 const credentials=redisCredentials();
 if(!credentials)throw new Error('Banco de dados indisponível. Na Vercel, conecte um banco Upstash Redis ao projeto e faça um novo deploy.');
 const response=await fetch(credentials.url,{method:'POST',headers:{Authorization:`Bearer ${credentials.token}`,'Content-Type':'application/json'},body:JSON.stringify(command)});
 const body=await response.json() as {result?:T;error?:string};
 if(!response.ok||body.error)throw new Error(body.error||'Não foi possível acessar o banco Redis.');
 return body.result as T;
}

function d1(){
 const database=(env as {DB?:D1Database}).DB;
 if(!database)throw new Error('Banco de dados indisponível.');
 return database;
}

export async function readWorkspace():Promise<WorkspaceRow>{
 if(redisCredentials()){
  const initial:WorkspaceRow={payload:JSON.stringify(initialData()),version:0};
  await redisCommand<number>(['SETNX',redisKey,JSON.stringify(initial)]);
  const stored=await redisCommand<string>(['GET',redisKey]);
  if(!stored)throw new Error('Não foi possível inicializar o banco Redis.');
  const row=JSON.parse(stored) as WorkspaceRow;
  if(typeof row.payload!=='string'||!Number.isInteger(row.version))throw new Error('Os dados persistidos estão em formato inválido.');
  return row;
 }
 const database=d1();
 await database.prepare('INSERT OR IGNORE INTO workspace (id,payload,version) VALUES (?,?,0)').bind('fiscaliza',JSON.stringify(initialData())).run();
 return (await database.prepare('SELECT payload,version FROM workspace WHERE id=?').bind('fiscaliza').first<WorkspaceRow>())!;
}

export async function updateWorkspace(payload:string,expectedVersion:number):Promise<boolean>{
 if(redisCredentials()){
  const script="local current=redis.call('GET',KEYS[1]); if not current then return 0 end; local row=cjson.decode(current); if tonumber(row.version)~=tonumber(ARGV[1]) then return 0 end; redis.call('SET',KEYS[1],ARGV[2]); return 1";
  const next=JSON.stringify({payload,version:expectedVersion+1});
  return await redisCommand<number>(['EVAL',script,1,redisKey,expectedVersion,next])===1;
 }
 const result=await d1().prepare('UPDATE workspace SET payload=?,version=version+1 WHERE id=? AND version=?').bind(payload,'fiscaliza',expectedVersion).run();
 return result.meta.changes===1;
}
