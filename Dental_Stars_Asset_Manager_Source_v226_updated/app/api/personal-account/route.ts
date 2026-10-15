import {requireAccess,rejectPreviewWrite,apiError,AccessError} from '../../permissions';
import {getDb} from '../../../db';
import {staff,settings,history} from '../../../db/schema';
import {isOwnStaffRecord} from '../../personal-account-model';
import {eq} from 'drizzle-orm';
import {guardedBatch} from '../../atomic-batch';
export async function POST(req:Request){try{
 const user=await requireAccess('read'),input:any=await req.json();
 rejectPreviewWrite(user);if(input.confirm!==true)throw new AccessError('Confirm that this is your own staff record.',400);
 const db=getDb(),row=(await db.select().from(staff).where(eq(staff.id,String(input.staffId||''))))[0],person=row&&JSON.parse(row.data);
 if(!person||person.archived||!person.email)throw new AccessError('Select your registered staff record.',400);
 if(!isOwnStaffRecord(person,user))throw new AccessError('Choose your own staff record. Other staff portals are view-only.',403);
 const id='personal-account:'+user.userId,all=await db.select().from(settings),old=all.find(r=>r.id===id);
 if(all.some(r=>r.id.startsWith('personal-account:')&&r.id!==id&&JSON.parse(r.data).staffId===person.id))throw new AccessError('This staff record is already connected to another login.',409);
 const date=new Date().toISOString(),event={id:crypto.randomUUID(),assetId:'Staff: '+person.name,date,action:'Own staff portal connected',recordedBy:{id:user.userId,name:user.displayName,email:user.email},details:{staffId:person.id,workEmail:person.email,loginEmail:user.email}};
 await guardedBatch([{table:'staff',id:person.id,data:row!.data}], [db.insert(settings).values({id,data:JSON.stringify({staffId:person.id,loginEmail:user.email,date})}).onConflictDoUpdate({target:settings.id,set:{data:JSON.stringify({staffId:person.id,loginEmail:user.email,date})}}),db.insert(history).values({id:event.id,assetId:event.assetId,date,data:JSON.stringify(event)})],[{sql:old?'NOT EXISTS (SELECT 1 FROM settings WHERE id = ? AND data = ?)':'EXISTS (SELECT 1 FROM settings WHERE id = ?)',params:old?[id,old.data]:[id]},{sql:"EXISTS (SELECT 1 FROM settings WHERE id LIKE 'personal-account:%' AND id != ? AND json_extract(data,'$.staffId') = ?)",params:[id,person.id]}]);
 return Response.json({ok:true});
}catch(e){return apiError(e)}}
