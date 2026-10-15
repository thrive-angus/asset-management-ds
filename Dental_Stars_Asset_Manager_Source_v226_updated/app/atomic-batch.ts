import {env} from 'cloudflare:workers';
import {AccessError} from './permissions';
// D1 batches are transactional. A failed guard prevents every write in the batch.
export async function guardedBatch(expected:{table:'assets'|'staff'|'audits';id:string;data?:string}[],queries:any[],extra:{sql:string;params:any[]}[]=[]){
if(!env.DB)throw Error('Database unavailable.');
const clauses=expected.map(r=>r.data===undefined?`EXISTS (SELECT 1 FROM ${r.table} WHERE id = ?)`:`NOT EXISTS (SELECT 1 FROM ${r.table} WHERE id = ? AND data = ?)`);clauses.push(...extra.map(v=>v.sql));
const guard=env.DB.prepare("INSERT INTO settings (id,data) SELECT NULL, 'Concurrent record change' WHERE "+(clauses.join(' OR ')||'0')).bind(...[...expected.flatMap(r=>r.data===undefined?[r.id]:[r.id,r.data]),...extra.flatMap(v=>v.params)]);
const statements=queries.map(q=>{const {sql,params}=q.toSQL();return env.DB!.prepare(sql).bind(...params)});
try{await env.DB.batch([guard,...statements])}catch(e:any){if(String(e?.message).includes('NOT NULL constraint failed: settings.id'))throw new AccessError('A record changed during this action. Refresh and review it before retrying.',409);throw e}
}
