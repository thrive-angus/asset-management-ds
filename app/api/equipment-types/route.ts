import {getDb} from '../../../db';
import {assets,settings,history} from '../../../db/schema';
import {eq} from 'drizzle-orm';
import {requireAccess,apiError} from '../../permissions';
import {equipmentTypeOptions,validateEquipmentType} from '../../asset-identifiers';
import {guardedBatch} from '../../atomic-batch';
export async function POST(req:Request){try{
 const user=await requireAccess('manage'),input:any=await req.json(),db=getDb();
 const row=(await db.select().from(settings).where(eq(settings.id,'equipment-types')))[0],saved:string[]=JSON.parse(row?.data||'[]');
 const all=equipmentTypeOptions(saved,(await db.select().from(assets)).map(r=>JSON.parse(r.data)));
 let name:string;try{name=validateEquipmentType(input.name,all)}catch(e:any){return Response.json({error:e.message},{status:400})}
 const data=JSON.stringify([...saved,name]),date=new Date().toISOString(),event={id:crypto.randomUUID(),assetId:'Equipment Types',date,action:'Equipment type added',details:{name},recordedBy:{id:user.userId,name:user.displayName,email:user.email}};
 await guardedBatch([],[db.insert(settings).values({id:'equipment-types',data}).onConflictDoUpdate({target:settings.id,set:{data}}),db.insert(history).values({id:event.id,assetId:event.assetId,date,data:JSON.stringify(event)})],[{sql:row?'NOT EXISTS (SELECT 1 FROM settings WHERE id = ? AND data = ?)':'EXISTS (SELECT 1 FROM settings WHERE id = ?)',params:row?['equipment-types',row.data]:['equipment-types']}]);
 return Response.json({ok:true,name});
}catch(e){return apiError(e)}}
