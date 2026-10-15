import {acknowledgedEquipment} from './equipment-acknowledgement';
import {warrantyStatus,warrantyUntil} from './warranty-model';

export function exportCsv(headers:string[],rows:unknown[][]){
 const cell=(value:unknown)=>'"'+String(value??'').replace(/^(\s*)([=+@-])/,"$1'$2").replaceAll('"','""')+'"';
 return '\ufeff'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
}
export function registerExports(assets:any[],staff:any[]){
 const equipment=assets.filter(a=>String(a.model||'').trim()&&String(a.category||'').trim()).sort((a,b)=>a.id.localeCompare(b.id));
 const assigned=(a:any,s:any)=>a.status==='Assigned'&&!a.archived&&(a.staffId?a.staffId===s.id:!!s.email&&a.assignee?.toLowerCase()===s.email.toLowerCase());
 const person=(a:any)=>staff.find(s=>a.staffId?s.id===a.staffId:!!s.email&&s.email.toLowerCase()===a.assignee?.toLowerCase());
 return {
  assets:exportCsv(['Asset ID','Equipment Type','Equipment','Serial Number','Status','Condition','Assigned To','Assignee Email','Date Issued','Purchase Date','Amount Paid (PHP)','Item Price (PHP)','Covered by Free Accessory Benefit (PHP)','Receipt Code','Warranty Status','Warranty Until','Location','Acknowledgement','Acknowledged On','Archived','Notes','Updated'],equipment.map(a=>[a.id,a.category,a.model,a.serial,a.status,a.condition,person(a)?.name||a.assignee,a.assignee,a.currentAssignmentDate,a.purchase,a.purchaseCost,a.itemValue,a.promotionalCreditUsed,a.receiptReference,warrantyStatus(a),warrantyUntil(a),a.location,a.status==='Assigned'?(acknowledgedEquipment(a)?'Acknowledged':'Awaiting Acknowledgement'):'Not Applicable',a.receipt?.acknowledgedAt||a.receipt?.date,a.archived?'Yes':'No',a.notes,a.updated])),
  staff:exportCsv(['Staff ID','Staff Name','Work Email','Position','Staff Status','Workflow Status','Start Date','End Date','Assigned Equipment','Acknowledged Equipment','Archived','Notes','Updated'],[...staff].sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(s=>{const items=equipment.filter(a=>assigned(a,s));return [s.id,s.name,s.email,s.role,s.employmentStatus||'Active',s.stage,s.start,s.end,items.length,items.filter(acknowledgedEquipment).length,s.archived?'Yes':'No',s.notes,s.updated]})),
  equipmentCount:equipment.length,staffCount:staff.length
 };
}
