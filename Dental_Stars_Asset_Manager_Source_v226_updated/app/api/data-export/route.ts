import {zipSync,strToU8} from 'fflate';
import {getDb} from '../../../db';
import {assets,staff,history,audits,auditChecks,settings} from '../../../db/schema';
import {requireAccess,apiError} from '../../permissions';
import {additionalExports} from '../../additional-data-exports';
import {registerExports} from '../../data-export-model';
import {todayPH} from '../../asset-model';

export async function GET(req:Request){try{
 const user=await requireAccess();if(user.role==='Staff'||user.isPreview)return Response.json({error:'Company exports require a management account outside role preview.'},{status:403});
 const kind=new URL(req.url).searchParams.get('kind')||'both';
 if(!['assets','staff','both','receipts','history','audits','planning','summary','issuances'].includes(kind))return Response.json({error:'Choose Asset Register, Staff Directory or both.'},{status:400});
 const db=getDb();
 const [assetRows,staffRows,eventRows,auditRows,checkRows,settingRows]=await db.batch([db.select().from(assets),db.select().from(staff),db.select().from(history),db.select().from(audits),db.select().from(auditChecks),db.select().from(settings)]);
 const checks=checkRows.map(r=>({...JSON.parse(r.data),auditId:r.auditId}));
 const auditsData=auditRows.map(r=>({...JSON.parse(r.data),checked:Object.fromEntries(checks.filter(c=>c.auditId===r.id).map(c=>[c.assetId,c]))}));
 const extra=additionalExports(assetRows.map(r=>JSON.parse(r.data)),staffRows.map(r=>JSON.parse(r.data)),eventRows.map(r=>JSON.parse(r.data)),auditsData,settingRows);
 const files=registerExports(assetRows.map(r=>JSON.parse(r.data)),staffRows.map(r=>JSON.parse(r.data)));
 const date=todayPH();
 const names:Record<string,string>={...Object.fromEntries(Object.keys(extra).map(k=>[k,'Dental-Stars-'+k+'-'+date+'.csv'])),assets:'Dental-Stars-Asset-Register-'+date+'.csv',staff:'Dental-Stars-Staff-Directory-'+date+'.csv'};
 const body=kind==='both'?zipSync({[names.assets]:strToU8(files.assets),[names.staff]:strToU8(files.staff),'READ-ME.txt':strToU8('Exported: '+new Date().toISOString()+'\nRegistered equipment: '+files.equipmentCount+'\nStaff: '+files.staffCount+'\nIncludes archived records, marked in the Archived column. Unused Asset IDs are excluded. Currency amounts are PHP. CSV exports contain current records only. Use Download Complete Backup for history, settings and documents.')}):({...extra,assets:files.assets,staff:files.staff} as Record<string,string>)[kind];
 return new Response(body as BodyInit,{headers:{'Content-Type':kind==='both'?'application/zip':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="'+(kind==='both'?'Dental-Stars-Registers-'+date+'.zip':names[kind as 'assets'|'staff'])+'"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(e){return apiError(e)}}
