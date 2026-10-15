import {approvedRole,activeStaff} from './access-policy-model';
import {getChatGPTUser} from './chatgpt-auth';
import {getDb} from '../db';
import {headers} from 'next/headers';
import {settings,staff} from '../db/schema';
import {eq} from 'drizzle-orm';
export const OWNER_ID='ceafd1dd-6ec0-4285-8731-2e6f3e17c4f2';
export const OWNER_EMAIL='lloyd.michaeldy93@gmail.com';
export const ROLES=['Administrator','Asset Manager','Viewer','Staff'] as const;
export async function identity(){
 const user=await getChatGPTUser();if(!user)return null;
 const db=getDb(),rows=await db.select().from(settings),people=(await db.select().from(staff)).map(r=>JSON.parse(r.data)),email=user.email.trim().toLowerCase();
 const access=JSON.parse(rows.find(r=>r.id==='access')?.data||'{}'),legacy=JSON.parse(rows.find(r=>r.id==='personal-account:'+user.userId)?.data||'null'),verified=JSON.parse(rows.find(r=>r.id==='login-staff:'+email)?.data||'null');
 const linkedId=verified?.staffId||(legacy?.loginEmail?.trim().toLowerCase()===email?legacy.staffId:null),linkedPerson=people.find(p=>p.id===linkedId),matched=people.find(p=>p.email?.trim().toLowerCase()===email),owner=user.userId===OWNER_ID||email===OWNER_EMAIL;
 const actualRole=approvedRole(access[email],owner,!!((linkedPerson&&!activeStaff(linkedPerson))||(matched&&!activeStaff(matched))));
 let role=actualRole,previewStaff:any=null;
 const cookie=(await headers()).get('cookie')||'',encoded=cookie.split(';').map(v=>v.trim()).find(v=>v.startsWith('ds_role_preview='))?.slice('ds_role_preview='.length);
 if(actualRole==='Administrator'&&encoded){try{const preview=JSON.parse(decodeURIComponent(encoded));if(['Asset Manager','Viewer','Staff'].includes(preview.role)){if(preview.role==='Staff'){previewStaff=people.find(p=>p.id===String(preview.staffId||''));if(previewStaff&&!previewStaff.archived&&previewStaff.email)role='Staff'}else role=preview.role}}catch{}}
 const isPreview=role!==actualRole,personalPerson=activeStaff(linkedPerson)?linkedPerson:activeStaff(matched)?matched:null;
 const personalEmail=role==='Staff'&&previewStaff?previewStaff.email:personalPerson?.email||user.email;
 return {...user,...(role==='Staff'&&previewStaff?{email:previewStaff.email,displayName:previewStaff.name}:{}),actualRole,role,isPreview,personalEmail,personalStaffId:personalPerson?.id||null,canManage:['Administrator','Asset Manager'].includes(role),isAdmin:role==='Administrator'};
}
export async function requireAccess(level:'read'|'manage'|'admin'='read'){
 const user=await identity();if(!user)throw new AccessError('Sign in to access records.',401);
 if(user.role==='Pending')throw new AccessError('Awaiting Access Approval. An Administrator must assign your app role.',403);
 if(user.role==='Suspended')throw new AccessError('Your app access is suspended. Contact an Administrator.',403);
 if(user.isPreview&&level!=='read')throw new AccessError('Preview is read-only. Return to Administrator to make changes.',403);
 if(level==='manage'&&!user.canManage||level==='admin'&&!user.isAdmin)throw new AccessError('Your role does not allow this action.',403);return user;
}
export function rejectPreviewWrite(user:any){if(user.isPreview)throw new AccessError('Preview is read-only. Return to Administrator to make changes.',403)}
export class AccessError extends Error{constructor(message:string,public status:number){super(message)}}
export function apiError(e:any,fallback='Unable to complete this action.'){return Response.json({error:e instanceof AccessError?e.message:e?.message||fallback},{status:e instanceof AccessError?e.status:500})}
