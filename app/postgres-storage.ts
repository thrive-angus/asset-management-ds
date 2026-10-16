// Uploaded documents share the PostgreSQL service's persistence and backups.
// This adapter is server-only and is reached through authorized API handlers.
type DocumentRow={key:string;data:Uint8Array;content_type:string;uploaded_at:Date|string;size:number|string};
type Pool = {query:(sql:string,values?:unknown[])=>Promise<{rows:DocumentRow[]}>};
export type StoredObject = {
 body:ArrayBuffer; size:number; httpMetadata:{contentType:string};
 arrayBuffer:()=>Promise<ArrayBuffer>;
};
export interface DocumentBucket {
 get(key:string):Promise<StoredObject|null>;
 head(key:string):Promise<{key:string;size:number;uploaded:Date}|null>;
 put(key:string,value:string|ArrayBuffer|ArrayBufferView,options?:{httpMetadata?:{contentType?:string}}):Promise<unknown>;
 delete(key:string):Promise<unknown>;
 list(options?:{prefix?:string;limit?:number}):Promise<{objects:{key:string;size:number;uploaded:Date}[]}>;
}
function validKey(key:string){
 if(typeof key!=='string'||key.length>512||!/^(evidence|backups)\/[A-Za-z0-9._-]+$/.test(key))throw Error('Invalid document storage key.');
}
function metadata(row:DocumentRow){return {key:row.key,size:Number(row.size),uploaded:new Date(row.uploaded_at)}}
export function postgresBucket(pool:Pool):DocumentBucket {
 return {
  async get(key){
   validKey(key);
   const {rows}=await pool.query('SELECT data, content_type FROM document_objects WHERE key = $1',[key]);
   if(!rows[0])return null;
   const body=new Uint8Array(rows[0].data).buffer;
   return {body,size:body.byteLength,httpMetadata:{contentType:rows[0].content_type},arrayBuffer:async()=>body};
  },
  async head(key){
   validKey(key);
   const {rows}=await pool.query('SELECT key, octet_length(data) AS size, uploaded_at FROM document_objects WHERE key = $1',[key]);
   return rows[0]?metadata(rows[0]):null;
  },
  async put(key,value,options){
   validKey(key);
   const bytes=typeof value==='string'?Buffer.from(value):value instanceof ArrayBuffer?Buffer.from(value):Buffer.from(value.buffer,value.byteOffset,value.byteLength);
   if(bytes.byteLength>32*1024*1024)throw Error('Document exceeds the storage size limit.');
   const contentType=options?.httpMetadata?.contentType||'application/octet-stream';
   if(!['image/jpeg','image/png','image/webp','application/pdf','application/json','application/octet-stream'].includes(contentType))throw Error('Unsupported document type.');
   await pool.query('INSERT INTO document_objects (key, data, content_type) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, content_type = EXCLUDED.content_type, uploaded_at = NOW()',[key,bytes,contentType]);
  },
  async delete(key){validKey(key);await pool.query('DELETE FROM document_objects WHERE key = $1',[key])},
  async list(options={}){
   const prefix=options.prefix||'';
   if(!['','evidence/','backups/'].includes(prefix))throw Error('Invalid document storage prefix.');
   const limit=options.limit??1000;
   if(!Number.isInteger(limit)||limit<1||limit>1000)throw Error('Invalid document storage limit.');
   const {rows}=await pool.query('SELECT key, octet_length(data) AS size, uploaded_at FROM document_objects WHERE left(key, length($1::text)) = $1 ORDER BY uploaded_at DESC, key LIMIT $2',[prefix,limit]);
   return {objects:rows.map(metadata)};
  },
 };
}
