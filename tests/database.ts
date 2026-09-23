import { DatabaseSync } from 'node:sqlite';
const db=new DatabaseSync(':memory:');
db.exec('CREATE TABLE workspace(id TEXT PRIMARY KEY,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0)');
export const env={DB:{prepare(sql:string){let args:any[]=[];const obj={bind(...a:any[]){args=a;return obj;},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};},async first(){return db.prepare(sql).get(...args);}};return obj;}}};
