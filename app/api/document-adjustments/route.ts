import {storageEnv,type StorageEnv} from '../../storage-env';
import {getDb} from '../../../db';
import {assets,settings,history} from '../../../db/schema';
import {eq} from 'drizzle-orm';
import {requireAccess,apiError} from '../../permissions';
import {guardedBatch} from '../../atomic-batch';
import {RECEIPT_SETTING} from '../../receipt-model';
export async function POST(req:Request){let uploadKey='';let env:StorageEnv={};try{
 const user=await requireAccess('manage');env=await storageEnv();const form=await req.formData(),input=JSON.parse(String(form.get('record')||'{}')),file=form.get('file'),db=getDb();
 if(!(file instanceof File)||!file.size||file.size>5*1024*1024||!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)||!['receipt','evidence'].includes(input.scope)||typeof input.key!=='string')return Response.json({error:'Choose an adjusted JPG, PNG, WebP or PDF up to 5 MB.'},{status:400});
 if(!env.BUCKET)throw Error('Document storage unavailable.');
 const receiptScope=input.scope==='receipt',row=receiptScope?(await db.select().from(settings).where(eq(settings.id,RECEIPT_SETTING)))[0]:(await db.select().from(assets).where(eq(assets.id,String(input.assetId||''))))[0];
 const records=receiptScope?JSON.parse(row?.data||'[]'):[],before=receiptScope?records.find((r:any)=>r.reference===input.reference):row?JSON.parse(row.data):null,field=receiptScope?'attachments':'evidence',original=before?.[field]?.find((a:any)=>a.key===input.key);
 if(!before||before.archived||before.updated!==input.updated||!original)return Response.json({error:'This record changed. Refresh before saving document adjustments.'},{status:409});
 uploadKey='evidence/'+crypto.randomUUID();await env.BUCKET.put(uploadKey,await file.arrayBuffer(),{httpMetadata:{contentType:file.type}});const date=new Date().toISOString(),attachment={...original,key:uploadKey,name:file.name.slice(0,150),type:file.type,size:file.size,adjustedFrom:original.key,adjustedAt:date,adjustedBy:user.displayName},after={...before,[field]:before[field].map((a:any)=>a.key===original.key?attachment:a),updated:date};
 if(!receiptScope&&before.returnInspection)after.returnInspection={...before.returnInspection,evidenceKeys:(before.returnInspection.evidenceKeys||[]).map((key:string)=>key===original.key?uploadKey:key)};
 const id=receiptScope?before.reference:before.id,event={id:crypto.randomUUID(),assetId:id,date,action:'Document adjusted',details:{name:attachment.name,originalKey:original.key,key:uploadKey},before,after,recordedBy:{id:user.userId,name:user.displayName,email:user.email}};
 if(receiptScope)await guardedBatch([],[db.update(settings).set({data:JSON.stringify(records.map((r:any)=>r.reference===id?after:r))}).where(eq(settings.id,RECEIPT_SETTING)),db.insert(history).values({id:event.id,assetId:id,date,data:JSON.stringify(event)})],[{sql:'NOT EXISTS (SELECT 1 FROM settings WHERE id = ? AND data = ?)',params:[RECEIPT_SETTING,row!.data]}]);
 else await guardedBatch([{table:'assets',id,data:row!.data}],[db.update(assets).set({data:JSON.stringify(after)}).where(eq(assets.id,id)),db.insert(history).values({id:event.id,assetId:id,date,data:JSON.stringify(event)})]);
 return Response.json({ok:true,...(receiptScope?{receipt:after}:{asset:after})});
 }catch(e){if(uploadKey)await env.BUCKET?.delete(uploadKey);return apiError(e)}}
