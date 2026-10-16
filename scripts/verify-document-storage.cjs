/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
function load(file,mocks={}){
 const exports={};
 const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('exports','require',code)(exports,name=>name in mocks?mocks[name]:require(name));
 return exports;
}
async function main(){
 const rows=new Map(),calls=[];
 const pool={async query(sql,values){
  calls.push({sql,values});
  if(sql.startsWith('INSERT')){const [key,data,content_type]=values;rows.set(key,{key,data:Buffer.from(data),content_type,uploaded_at:new Date()});return {rows:[]}}
  if(sql.startsWith('DELETE')){rows.delete(values[0]);return {rows:[]}}
  if(sql.includes('WHERE key = $1')){const row=rows.get(values[0]);return {rows:row?[{...row,size:row.data.length}]:[]}}
  if(sql.includes('WHERE left(key,'))return {rows:[...rows.values()].filter(r=>r.key.startsWith(values[0])).map(r=>({...r,size:r.data.length})).slice(0,values[1])};
  throw Error('Unexpected SQL');
 }};
 const {postgresBucket}=load('app/postgres-storage.ts'),bucket=postgresBucket(pool);
 const bytes=Uint8Array.from([99,0,255,44]);
 await bucket.put('evidence/abc',bytes.subarray(1,3),{httpMetadata:{contentType:'image/jpeg'}});
 const object=await bucket.get('evidence/abc');
 assert.deepEqual([...new Uint8Array(await object.arrayBuffer())],[0,255]);
 assert.equal(object.httpMetadata.contentType,'image/jpeg');
 assert.equal((await bucket.head('evidence/abc')).size,2);
 assert.equal(await bucket.get('evidence/missing'),null);
 assert.equal(await bucket.head('evidence/missing'),null);
 await bucket.put('backups/2026-10-16.json','{"test":true}',{httpMetadata:{contentType:'application/json'}});
 assert.equal((await bucket.list({prefix:'backups/'})).objects.length,1);
 assert.equal((await bucket.list({prefix:'evidence/'})).objects[0].key,'evidence/abc');
 await bucket.put('evidence/abc',new Uint8Array([4]).buffer,{httpMetadata:{contentType:'image/png'}});
 assert.equal((await bucket.get('evidence/abc')).size,1);
 for(const key of ['../secrets','other/file','evidence/a?x=y',"evidence/a' OR 1=1"]){await assert.rejects(()=>bucket.get(key));await assert.rejects(()=>bucket.put(key,'x'))}
 await assert.rejects(()=>bucket.put('evidence/abc','x',{httpMetadata:{contentType:'text/html'}}));
 await assert.rejects(()=>bucket.put('evidence/large',new Uint8Array(32*1024*1024+1)));
 await assert.rejects(()=>bucket.list({prefix:'backups/%'}));
 await assert.rejects(()=>bucket.list({limit:1001}));
 assert(calls.every(c=>Array.isArray(c.values)));
 const {documentResponse}=load('app/document-response.ts');
 let response=await documentResponse({BUCKET:bucket},'evidence/abc');
 assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'image/png');
 assert.equal(response.headers.get('Cache-Control'),'private, no-store');
 assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[4]);
 assert.equal((await documentResponse({BUCKET:bucket},'evidence/abc',true)).headers.get('Content-Disposition'),'attachment');
 assert.equal((await documentResponse({},'evidence/abc')).status,503);
 response=await documentResponse({BUCKET:bucket},'evidence/missing');assert.equal(response.status,404);assert.match((await response.json()).error,/restore/i);
 const {fetchDocument}=load('app/document-fetch.ts'),originalFetch=global.fetch;
 try{
  global.fetch=async()=>documentResponse({BUCKET:bucket},'evidence/abc');assert.equal((await fetchDocument('/api/receipts?key=evidence/abc')).type,'image/png');
  global.fetch=async()=>documentResponse({BUCKET:bucket},'evidence/missing');await assert.rejects(()=>fetchDocument('/api/receipts'),/restore/i);
  global.fetch=async()=>new Response('login',{headers:{'content-type':'text/html'}});await assert.rejects(()=>fetchDocument('/api/receipts'),/supported document/);
  global.fetch=async()=>new Response('',{status:401});await assert.rejects(()=>fetchDocument('/api/receipts'),/session/);
  global.fetch=async()=>new Response('',{headers:{'content-type':'image/png'}});await assert.rejects(()=>fetchDocument('/api/receipts'),/empty/);
 }finally{global.fetch=originalFetch}
 await bucket.delete('evidence/abc');assert.equal(await bucket.get('evidence/abc'),null);
 // Exercise the actual backup handler with the same PostgreSQL document adapter.
 const model=load('app/backup-model.ts');
 const tables=Object.fromEntries(model.BACKUP_TABLES.map(key=>[key,{name:key,id:{name:'id'}}]));
 const records=Object.fromEntries(model.BACKUP_TABLES.map(key=>[key,[]]));
 records.assets=[{id:'A',data:JSON.stringify({id:'A',model:'Current laptop'})}];
 records.settings=[{id:'receipt-register',data:JSON.stringify([{reference:'REC-2026-001',attachments:[{key:'evidence/aaaa'}]}])},{id:'access',data:'{"admin@example.com":"Administrator"}'}];
 const db={
  select(){return {from(table){let result=records[table.name];const q={where(c){result=result.filter(row=>row.id===c.value);return q},then(resolve,reject){return Promise.resolve(result).then(resolve,reject)}};return q}}},
  insert(table){
   return {values(value){
    const apply=replace=>{const list=records[table.name],i=list.findIndex(row=>row.id===value.id);if(i<0)list.push(value);else if(replace)list[i]=value};
    return {
     onConflictDoNothing:async()=>apply(false),
     onConflictDoUpdate:async()=>apply(true),
     then(resolve,reject){try{apply(false);return Promise.resolve().then(resolve,reject)}catch(e){return Promise.reject(e).then(resolve,reject)}}
    };
   }};
  },
  async transaction(action){return action(db)},
 };
 const backupRoute=load('app/api/backup/route.ts',{'../../backup-model':model,'../../../db':{getDb:()=>db},'../../../db/schema':tables,'../../permissions':{requireAccess:async()=>({email:'admin@example.com',displayName:'Admin',userId:'admin'}),apiError:error=>{throw error}},'drizzle-orm':{eq:(_column,value)=>({value})},'../../storage-env':{storageEnv:async()=>({BUCKET:bucket})}});
 const backup={format:'dental-stars-backup',version:1,records:structuredClone(records),files:[{key:'evidence/aaaa',type:'image/jpeg',base64:Buffer.from([7,8,255]).toString('base64')}]};
 backup.records.assets[0].data=JSON.stringify({id:'A',model:'Old laptop'});
 const request=action=>new Request('https://example.com/api/backup',{method:'POST',body:JSON.stringify({backup,mode:'missing',action,confirm:true})});
 response=await backupRoute.POST(request('preview'));assert.equal((await response.json()).files,1);assert.equal(await bucket.get('evidence/aaaa'),null);
 response=await backupRoute.POST(request('restore'));assert.equal((await response.json()).evidence.imported,1);
 assert.equal(JSON.parse(records.assets[0].data).model,'Current laptop');
 assert.deepEqual([...new Uint8Array((await bucket.get('evidence/aaaa')).body)],[7,8,255]);
 response=await backupRoute.POST(request('restore'));assert.equal((await response.json()).evidence.skipped,1);
 response=await backupRoute.GET(new Request('https://example.com/api/backup'));const exported=await response.json();
 assert.equal(exported.files[0].base64,backup.files[0].base64);model.validateBackup(exported);
 response=await backupRoute.GET(new Request('https://example.com/api/backup?mode=list'));assert((await response.json()).items.length>=1);
 let role='Viewer',storageCalls=0;
 class AccessError extends Error{constructor(message,status){super(message);this.status=status}}
 const receiptRoute=load('app/api/receipts/route.ts',{
  '../../document-response':{documentResponse},
  '../../storage-env':{storageEnv:async()=>{storageCalls++;return {BUCKET:bucket}}},
  '../../../db':{getDb:()=>db},'../../../db/schema':tables,'drizzle-orm':{eq:(_column,value)=>({value})},
  '../../permissions':{requireAccess:async()=>{if(!role)throw new AccessError('Sign in',401);return {role}},AccessError,apiError:error=>Response.json({error:error.message},{status:error.status||500})},
  '../../atomic-batch':{},'../../receipt-model':{RECEIPT_SETTING:'receipt-register'},'../../asset-model':{},
 });
 const receiptRequest=key=>new Request('https://example.com/api/receipts?key='+encodeURIComponent(key));
 response=await receiptRoute.GET(receiptRequest('evidence/aaaa'));assert.equal(response.status,200);assert.equal((await response.arrayBuffer()).byteLength,3);
 assert.equal((await receiptRoute.GET(receiptRequest('backups/2026-10-16.json'))).status,404);
 role='Staff';assert.equal((await receiptRoute.GET(receiptRequest('evidence/aaaa'))).status,403);
 role=null;storageCalls=0;assert.equal((await receiptRoute.GET(receiptRequest('evidence/aaaa'))).status,401);assert.equal(storageCalls,0);
 const old=process.env.DATABASE_URL;
 try{
  process.env.DATABASE_URL='postgres://fixture';
  const {storageEnv}=load('app/storage-env.ts',{'../db':{getPgPool:()=>pool},'./postgres-storage':{postgresBucket},'cloudflare:workers':{env:{BUCKET:{fixture:true}}}});
  assert.equal((await storageEnv()).BUCKET.get instanceof Function,true);
  delete process.env.DATABASE_URL;
  assert.equal((await storageEnv()).BUCKET.fixture,true);
 }finally{if(old===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=old}
 console.log('Document storage checks passed: PostgreSQL adapter fixtures, binary round trips, backup listing, validation, storage selection, response headers and preview errors.');
}
main().catch(error=>{console.error(error);process.exit(1)});
