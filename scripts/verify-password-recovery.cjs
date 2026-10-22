/* eslint-disable @typescript-eslint/no-require-imports */
// Isolated SQL/SMTP fixtures: no real database, credentials or outbound email.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map(),messages=[],tasks=[];
let activeAccount=null,failMail=false,forceLimit=false,config,transportOptions;
let state={users:[],tokens:[],sessions:[],limits:[],roles:{'user@example.com':'Suspended'}},tail=Promise.resolve();
const queries=[];
function rows(values){return {rows:values,rowCount:values.length}}
async function execute(sql,values=[],transaction){
 const text=sql.replace(/\s+/g,' ').trim();queries.push({text,values});
 if(text==='BEGIN'){transaction.before=structuredClone(state);return rows([])}
 if(text==='COMMIT'){transaction.before=null;return rows([])}
 if(text==='ROLLBACK'){if(transaction.before)state=transaction.before;transaction.before=null;return rows([])}
 if(text.startsWith('SELECT id, email, password_hash FROM auth_users'))return rows(state.users.filter(user=>text.includes('WHERE email =')?user.email===values[0]:user.id===values[0]));
 if(text.startsWith('SELECT user_id FROM auth_password_resets'))return rows(state.tokens.filter(token=>token.token_hash===values[0]&&token.expires_at>Date.now()).map(token=>({user_id:token.user_id})));
 if(text.startsWith('INSERT INTO auth_password_resets')){state.tokens.push({token_hash:values[0],user_id:values[1],email:values[2],password_hash_snapshot:values[3],expires_at:Date.now()+1800000});return rows([])}
 if(text.startsWith('DELETE FROM auth_password_resets WHERE token_hash =')){
  const matching=state.tokens.filter(token=>token.token_hash===values[0]&&(!text.includes('RETURNING')||token.user_id===values[1]&&token.email===values[2]&&token.password_hash_snapshot===values[3]&&token.expires_at>Date.now()));
  state.tokens=state.tokens.filter(token=>!matching.includes(token));return rows(matching);
 }
 if(text.startsWith('DELETE FROM auth_password_resets WHERE user_id =')){state.tokens=state.tokens.filter(token=>token.user_id!==values[0]&&(!text.includes('OR expires_at')||token.expires_at>Date.now()));return rows([])}
 if(text.startsWith('UPDATE auth_users SET password_hash =')){const user=state.users.find(user=>user.id===values[1]);user.password_hash=values[0];user.must_reset_password=false;return rows([])}
 if(text.startsWith('SELECT expires_at FROM auth_sessions'))return rows(state.sessions.filter(session=>session.id===values[0]&&session.user_id===values[1]));
 if(text.startsWith('DELETE FROM auth_sessions')){state.sessions=state.sessions.filter(session=>session.user_id!==values[0]);return rows([])}
 if(text.startsWith('DELETE FROM auth_login_attempts')){state.limits=state.limits.filter(limit=>limit.id!==values[0]);return rows([])}
 if(text.startsWith('INSERT INTO auth_login_attempts')){
  if(forceLimit)return rows([]);
  let entry=state.limits.find(entry=>entry.id===values[0]);if(!entry){entry={id:values[0],attempts:0};state.limits.push(entry)}
  if(entry.attempts>=values[1])return rows([]);entry.attempts++;return rows([{id:entry.id}]);
 }
 throw Error('Unexpected SQL in password fixture: '+text);
}
const pool={async connect(){
 const previous=tail;let release;tail=new Promise(resolve=>{release=resolve});await previous;
 const transaction={before:null};return {query:(sql,values)=>execute(sql,values,transaction),release};
},query:(sql,values)=>execute(sql,values,{before:null})};
function load(file){
 const absolute=path.resolve(root,file);if(cache.has(absolute))return cache.get(absolute);
 const exports={};cache.set(absolute,exports);
 const compiled=ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 new Function('exports','require',compiled)(exports,name=>{
  if(name==='nodemailer')return {
   createTransport(options){
    transportOptions=options;
    return {verify:async()=>true,close(){},async sendMail(message){
     if(failMail)throw Error('Sensitive provider detail');
     messages.push(message);return {accepted:[message.to.address]};
    }};
   },
  };
  if(name==='next/server')return {NextResponse:require('next/server').NextResponse,after:callback=>tasks.push(callback)};
  if(name.startsWith('.')){const target=path.resolve(path.dirname(absolute),name);if(target===path.join(root,'db'))return {getPgPool:()=>pool};if(target===path.join(root,'app/local-auth'))return {sessionAccount:async()=>activeAccount};return load(path.extname(target)?target:target+'.ts')}
  return require(name);
 });return exports;
}
const auth=load('app/password-auth.ts'),service=load('app/password-recovery.ts'),mail=load('app/password-email.mjs');
const forgot=load('app/api/auth/forgot-password/route.ts'),redeem=load('app/api/auth/reset-password/route.ts'),change=load('app/api/auth/change-password/route.ts');
const oldPassword='OriginalPassword!456',newPassword='ReplacementPassword!789';
function reset(){state={users:[{id:'U1',email:'user@example.com',password_hash:auth.hashPassword(oldPassword),must_reset_password:true},{id:'U2',email:'other@example.com',password_hash:auth.hashPassword(oldPassword),must_reset_password:false}],tokens:[],sessions:[{id:'SESSION',user_id:'U1',expires_at:new Date(Date.now()+600000).toISOString()},{id:'SECOND',user_id:'U1',expires_at:new Date(Date.now()+600000).toISOString()}],limits:[],roles:{'user@example.com':'Suspended'}};messages.length=tasks.length=queries.length=0;activeAccount=null;failMail=forceLimit=false}
function request(body,cookie=''){return new Request('https://portal.example.test/api/auth/test',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://portal.example.test',cookie},body:JSON.stringify(body)})}
function sentToken(){return new URLSearchParams(messages.at(-1).text.match(/https:\/\/[^\s]+/)[0].split('#')[1]).get('token')}
let passed=0;async function check(name,action){reset();await action();passed++;console.log('PASS '+name)}
async function main(){
 const names=['APP_ORIGIN','SMTP_HOST','SMTP_PORT','SMTP_SECURE','SMTP_USER','SMTP_PASSWORD','MAIL_FROM','NODE_ENV'];
 config=Object.fromEntries(names.map(name=>[name,process.env[name]]));
 Object.assign(process.env,{APP_ORIGIN:'https://portal.example.test',SMTP_HOST:'smtp.example.test',SMTP_PORT:'587',SMTP_SECURE:'false',SMTP_USER:'fixture',SMTP_PASSWORD:'fixture-not-a-secret',MAIL_FROM:'Dental Stars <no-reply@example.test>',NODE_ENV:'production'});
 try{
  await check('Email configuration requires a trusted HTTPS origin and TLS SMTP',async()=>{
   const settings=mail.passwordMailSettings();assert.equal(settings.transport.requireTLS,true);assert.equal(settings.transport.tls.rejectUnauthorized,true);assert.equal(settings.transport.disableUrlAccess,true);
   assert.throws(()=>mail.passwordMailSettings({...process.env,APP_ORIGIN:'http://evil.example'}));assert.throws(()=>mail.passwordMailSettings({...process.env,APP_ORIGIN:'https://user:pass@portal.example.test'}));
   assert.throws(()=>mail.passwordMailSettings({...process.env,MAIL_FROM:'bad\r\nBcc: someone@example.test'}));assert.throws(()=>mail.passwordMailSettings({...process.env,SMTP_PORT:'NaN'}));
   assert.equal(mail.passwordMailSettings({...process.env,SMTP_PORT:'465',SMTP_SECURE:'true'}).transport.secure,true);
  });
  await check('Reset requests return identical generic responses and defer account lookup/mail',async()=>{
   const existing=await forgot.POST(request({email:'USER@example.com'})),unknown=await forgot.POST(request({email:'absent@example.com'}));
   assert.equal(existing.status,200);assert.deepEqual(await existing.json(),await unknown.json());assert.equal(messages.length,0);assert.equal(state.tokens.length,0);
   await tasks[0]();await tasks[1]();assert.equal(messages.length,1);assert.equal(messages[0].to.address,'user@example.com');
  });
  await check('Links use random tokens, store only their digest and keep secrets out of query URLs',async()=>{
   await service.deliverPasswordReset('user@example.com');const token=sentToken();assert(service.validResetToken(token));assert.notEqual(state.tokens[0].token_hash,token);assert.equal(state.tokens[0].token_hash,service.resetTokenHash(token));
   assert(!queries.some(query=>query.values.includes(token)));const url=new URL(messages[0].text.match(/https:\/\/[^\s]+/)[0]);assert.equal(url.origin,'https://portal.example.test');assert.equal(url.pathname,'/recover-password');assert.equal(url.search,'');assert.match(url.hash,/^#token=/);assert.equal(transportOptions.requireTLS,true);
  });
  await check('Missing SMTP setup is explicit and does not query accounts',async()=>{
   const original=process.env.SMTP_HOST;delete process.env.SMTP_HOST;try{assert.equal((await forgot.POST(request({email:'user@example.com'}))).status,503);assert.equal(tasks.length,0);assert.equal(queries.length,0)}finally{process.env.SMTP_HOST=original}
  });
  await check('Rate limits apply equally to unknown accounts and known accounts',async()=>{
   for(const email of ['user@example.com','missing@example.com']){for(let i=0;i<3;i++)assert.equal((await forgot.POST(request({email}))).status,200);assert.equal((await forgot.POST(request({email}))).status,429)}
  });
  await check('A newer reset request invalidates the earlier link',async()=>{
   await service.deliverPasswordReset('user@example.com');const old=sentToken();await service.deliverPasswordReset('user@example.com');assert.notEqual(sentToken(),old);assert.equal(state.tokens.length,1);await assert.rejects(()=>service.redeemPasswordReset(old,newPassword),/invalid or expired/);
  });
  await check('Expired, tampered and malformed tokens cannot change passwords or sessions',async()=>{
   await service.deliverPasswordReset('user@example.com');const token=sentToken(),before=state.users[0].password_hash;state.tokens[0].expires_at=Date.now()-1;
   await assert.rejects(()=>service.redeemPasswordReset(token,newPassword),/invalid or expired/);await assert.rejects(()=>service.redeemPasswordReset('f'.repeat(64),newPassword),/invalid or expired/);
   assert.equal((await redeem.POST(request({token:'invalid',newPassword,confirmPassword:newPassword}))).status,400);assert.equal(state.users[0].password_hash,before);assert.equal(state.sessions.length,2);
  });
  await check('Admin password and email changes invalidate outstanding links',async()=>{
   await service.deliverPasswordReset('user@example.com');const token=sentToken();state.users[0].email='changed@example.com';await assert.rejects(()=>service.redeemPasswordReset(token,newPassword),/invalid or expired/);
   state.users[0].email='user@example.com';state.users[0].password_hash=auth.hashPassword('AdminChangedPassword!123');await assert.rejects(()=>service.redeemPasswordReset(token,newPassword),/invalid or expired/);
  });
  await check('Successful reset clears sessions and old links without changing access roles',async()=>{
   await service.deliverPasswordReset('user@example.com');const token=sentToken(),other=state.users[1].password_hash;await service.redeemPasswordReset(token,newPassword);
   assert(auth.verifyPassword(newPassword,state.users[0].password_hash));assert(!auth.verifyPassword(oldPassword,state.users[0].password_hash));assert.equal(state.users[0].must_reset_password,false);assert.equal(state.sessions.length,0);assert.equal(state.tokens.length,0);assert.equal(state.roles['user@example.com'],'Suspended');assert.equal(state.users[1].password_hash,other);
   await assert.rejects(()=>service.redeemPasswordReset(token,'AnotherPassword!123'),/invalid or expired/);
  });
  await check('Concurrent token redemptions permit only one password update',async()=>{
   await service.deliverPasswordReset('user@example.com');const token=sentToken();const results=await Promise.allSettled([service.redeemPasswordReset(token,newPassword),service.redeemPasswordReset(token,'AnotherPassword!123')]);assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(state.tokens.length,0);
  });
  await check('Failed SMTP delivery removes its usable token',async()=>{
   failMail=true;await assert.rejects(()=>service.deliverPasswordReset('user@example.com'),/email delivery failed/);assert.equal(state.tokens.length,0);assert.equal(state.sessions.length,2);
  });
  await check('Rejected password reuse rolls back token consumption',async()=>{
   await service.deliverPasswordReset('user@example.com');const token=sentToken();await assert.rejects(()=>service.redeemPasswordReset(token,oldPassword),/different/);assert.equal(state.tokens.length,1);await service.redeemPasswordReset(token,newPassword);
  });
  await check('Signed-in change requires the current password and rechecks revoked sessions',async()=>{
   const account={token:'SESSION',user:{id:'U1'}};
   await assert.rejects(()=>service.updateOwnPassword(account,'wrong',newPassword),/current password/);assert.equal(state.sessions.length,2);
   state.sessions=[];await assert.rejects(()=>service.updateOwnPassword(account,oldPassword,newPassword),error=>error.status===401);assert(auth.verifyPassword(oldPassword,state.users[0].password_hash));
  });
  await check('Signed-in change revokes all sessions and invalidates recovery links',async()=>{
   await service.deliverPasswordReset('user@example.com');await service.updateOwnPassword({token:'SESSION',user:{id:'U1'}},oldPassword,newPassword);assert.equal(state.sessions.length,0);assert.equal(state.tokens.length,0);assert(auth.verifyPassword(newPassword,state.users[0].password_hash));
  });
  await check('Change API rejects anonymous and preview requests before credential work',async()=>{
   assert.equal((await change.POST(request({}))).status,401);assert.equal(queries.length,0);activeAccount={token:'SESSION',user:{id:'U1'}};assert.equal((await change.POST(request({},'ds_role_preview=fixture'))).status,403);assert.equal(queries.length,0);
  });
  await check('Validation and throttling precede password mutation',async()=>{
   assert(service.newPasswordError('short','short'));assert(service.newPasswordError(newPassword,'different'));
   assert.equal((await forgot.POST(request({email:'bad\nmail@example.com'}))).status,400);assert.equal(tasks.length,0);
   activeAccount={token:'SESSION',user:{id:'U1'}};forceLimit=true;assert.equal((await change.POST(request({currentPassword:oldPassword,newPassword,confirmPassword:newPassword}))).status,429);assert.equal(state.sessions.length,2);
  });
  await check('Reset API clears cookies and does not automatically create a session',async()=>{
   await service.deliverPasswordReset('user@example.com');const result=await redeem.POST(request({token:sentToken(),newPassword,confirmPassword:newPassword}));assert.equal(result.status,200);assert.match(result.headers.get('set-cookie'),/ds_session=;.*Max-Age=0/);assert.equal(state.sessions.length,0);assert.deepEqual(await result.json(),{ok:true});
  });
  console.log('Verified '+passed+' password recovery/security scenarios using SQL and SMTP fixtures.');
 }finally{for(const [name,value] of Object.entries(config)){if(value===undefined)delete process.env[name];else process.env[name]=value}}
}
main().catch(error=>{console.error(error);process.exitCode=1});
