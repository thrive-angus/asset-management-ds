import {getSqlite} from '../db';
import {AccessError} from './permissions';
// Transactions keep guard checks and writes atomic.
type SqlQuery = {toSQL:()=>{sql:string;params:unknown[]}};
export async function guardedBatch(expected:{table:'assets'|'staff'|'audits';id:string;data?:string}[],queries:SqlQuery[],extra:{sql:string;params:unknown[]}[]=[]){
const clauses=expected.map(r=>r.data===undefined?`EXISTS (SELECT 1 FROM ${r.table} WHERE id = ?)`:`NOT EXISTS (SELECT 1 FROM ${r.table} WHERE id = ? AND data = ?)`);clauses.push(...extra.map(v=>v.sql));
const guardSql="SELECT 1 AS blocked WHERE "+(clauses.join(' OR ')||'0');
const guardParams=[...expected.flatMap(r=>r.data===undefined?[r.id]:[r.id,r.data]),...extra.flatMap(v=>v.params)];
const sqlite=getSqlite();
const tx=sqlite.transaction(()=>{
 const guardBlocked=sqlite.prepare(guardSql).get(...guardParams) as {blocked:number}|undefined;
 if(guardBlocked)throw new AccessError('A record changed during this action. Refresh and review it before retrying.',409);
 for(const q of queries){const {sql,params}=q.toSQL();sqlite.prepare(sql).run(...params)}
});
tx();
}
