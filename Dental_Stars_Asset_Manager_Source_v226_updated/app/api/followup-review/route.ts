import {getDb} from '../../../db';
import {assets,history} from '../../../db/schema';
import {eq} from 'drizzle-orm';
import {requireAccess,apiError} from '../../permissions';
import {guardedBatch} from '../../atomic-batch';
import {todayPH} from '../../asset-model';
import {REVIEW_TYPES,reviewSource,reviewDue} from '../../followup-model';
export function validReviewDate(date:any,today:string){return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&!isNaN(Date.parse(date))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date&&date>today}
export async function POST(req:Request){try{const user=await requireAccess('manage'),input:any=await req.json(),db=getDb(),today=todayPH();
 if(!REVIEW_TYPES.includes(input.type)||!['Reviewed — Continue Using','Action Pending'].includes(input.outcome)||typeof input.note!=='string'||!input.note.trim()||input.note.length>2000)return Response.json({error:'Choose a review outcome and enter a short decision note.'},{status:400});
 if(input.outcome!=='Action Pending'&&!validReviewDate(input.nextReviewDate,today))return Response.json({error:'Choose a next review date after today.'},{status:400});
 const row=(await db.select().from(assets).where(eq(assets.id,input.assetId||'')))[0],asset=row?JSON.parse(row.data):null,rows=await db.select().from(history).where(eq(history.assetId,input.assetId||'')),events=rows.map(r=>JSON.parse(r.data));
 if(!asset||asset.updated!==input.updated||!reviewDue(asset,input.type,events,today))return Response.json({error:'This follow-up changed or is no longer active. Refresh before reviewing.'},{status:409});
 const date=new Date().toISOString(),event={id:crypto.randomUUID(),assetId:asset.id,date,effectiveDate:today,action:'Follow-up reviewed',recordedBy:{id:user.userId,name:user.displayName,email:user.email},details:{type:input.type,source:reviewSource(asset,input.type),outcome:input.outcome,nextReviewDate:input.outcome==='Action Pending'?'':input.nextReviewDate,note:input.note.trim()}};
 await guardedBatch([{table:'assets',id:asset.id,data:row!.data}],[db.insert(history).values({id:event.id,assetId:asset.id,date,data:JSON.stringify(event)})],[{sql:'(SELECT COUNT(*) FROM history WHERE asset_id = ?) <> ?',params:[asset.id,rows.length]}]);return Response.json({ok:true});
 }catch(e){return apiError(e)}}
