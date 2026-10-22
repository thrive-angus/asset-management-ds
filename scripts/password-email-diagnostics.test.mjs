import {test} from 'node:test';
import assert from 'node:assert/strict';
import {passwordEmailConfigurationIssues,passwordEmailConnectionIssue} from './password-email-diagnostics.mjs';
const valid={NODE_ENV:'production',APP_ORIGIN:'https://portal.example.test',SMTP_HOST:'smtp.mailgun.org',SMTP_PORT:'587',SMTP_SECURE:'false',SMTP_USER:'fixture',SMTP_PASSWORD:'PRIVATE-CREDENTIAL',MAIL_FROM:'Dental Stars <no-reply@example.test>'};
test('configuration errors identify the setting without exposing values',()=>{
 assert.deepEqual(passwordEmailConfigurationIssues(valid),[]);
 assert.match(passwordEmailConfigurationIssues({...valid,SMTP_PASSWORD:''}).join(' '),/SMTP_PASSWORD/);
 assert.match(passwordEmailConfigurationIssues({...valid,APP_ORIGIN:'https://PRIVATE-CREDENTIAL@example.test/path'}).join(' '),/APP_ORIGIN/);
 assert.match(passwordEmailConfigurationIssues({...valid,SMTP_PORT:'invalid'}).join(' '),/SMTP_PORT/);
 assert.match(passwordEmailConfigurationIssues({...valid,SMTP_SECURE:'"false"'}).join(' '),/SMTP_SECURE/);
 assert.match(passwordEmailConfigurationIssues({...valid,SMTP_HOST:'smtp://example.test'}).join(' '),/SMTP_HOST/);
 for(const [name] of Object.entries(valid))assert(!passwordEmailConfigurationIssues({...valid,[name]:'PRIVATE-CREDENTIAL'}).join(' ').includes('PRIVATE-CREDENTIAL'));
});
test('authentication failure exposes only a safe error category and numeric status',()=>{
 const result=passwordEmailConnectionIssue({code:'EAUTH',responseCode:535,message:'PRIVATE-CREDENTIAL',response:'PRIVATE-CREDENTIAL',command:'AUTH PRIVATE-CREDENTIAL'});
 assert.match(result,/EAUTH/);assert.match(result,/535/);assert.match(result,/SMTP username\/password/);assert(!result.includes('PRIVATE-CREDENTIAL'));
});
test('unknown or hostile provider fields cannot enter diagnostic output',()=>{
 for(const code of ['PRIVATE-CREDENTIAL','constructor','toString','__proto__',null,42]){
  const result=passwordEmailConnectionIssue({code,responseCode:'535 PRIVATE-CREDENTIAL',message:'PRIVATE-CREDENTIAL'});
  assert.match(result,/UNKNOWN/);assert(!result.includes('PRIVATE-CREDENTIAL'));
 }
 assert.match(passwordEmailConnectionIssue(null),/UNKNOWN/);
});
test('network and TLS errors have actionable guidance without disabling verification',()=>{
 assert.match(passwordEmailConnectionIssue({code:'ENOTFOUND'}),/DNS/);
 assert.match(passwordEmailConnectionIssue({code:'ETIMEDOUT'}),/outbound/);
 assert.match(passwordEmailConnectionIssue({code:'ESOCKET'}),/keep certificate verification enabled/);
});
