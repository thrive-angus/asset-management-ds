import {todayPH} from './asset-model';
import {acknowledgedEquipment} from './equipment-acknowledgement';
export function buildNotifications(user:any,data:{assets:any[];staff:any[];audits:any[];requests:any[];history:any[];roleRequests?:any[]},today=todayPH()){
const items:any[]=[],assets=data.assets.filter(a=>!a.archived),email=user.email.toLowerCase();const add=(id:string,title:string,description:string,target:any,priority='Normal',date='')=>{if(!items.some(n=>n.id===id))items.push({id,title,description,target,priority,date})};
if(user.isAdmin&&!user.isPreview)for(const r of data.roleRequests||[])if(r.status==='Pending'&&data.staff.some(s=>s.id===r.staffId&&!s.archived))add('role-approval:'+r.id,'Role Assignment Approval Required',r.name+' · Requested role: '+r.role+' · Requested by '+r.requestedBy.name,{type:'roleApproval',id:r.id},'Action Required',r.date);
if(user.role==='Staff'){
for(const a of assets.filter(a=>a.status==='Assigned'&&a.assignee?.toLowerCase()===email&&!acknowledgedEquipment(a)))add('ack-pending:'+a.id+':'+(a.currentAssignmentDate||a.updated),'Equipment Awaiting Acknowledgement',a.id+' · '+a.model,{type:'acknowledgement',id:a.id},'Action Required',a.currentAssignmentDate||a.updated);

for(const r of data.requests.filter(r=>r.email===email&&r.status==='Resolved'))add('report-resolved:'+r.id+':'+r.resolvedAt,'Your Equipment Report Was Resolved',r.type+' · '+r.resolution,{type:'personalReport',id:r.id},'Normal',r.resolvedAt);
}else if(user.canManage){
for(const e of data.history.filter(e=>e.action==='Receipt acknowledged')){const receipt=e.details||e.after?.receipt;if(!receipt?.date||!e.assetId)continue;add('manager-ack-complete:'+e.assetId+':'+receipt.date,'Equipment Acknowledged',e.assetId+' · '+(receipt.name||e.recordedBy?.name||'Staff member'),{type:'asset',id:e.assetId},'Normal',receipt.date)}
for(const a of assets.filter(a=>a.status==='Assigned'&&acknowledgedEquipment(a)))add('manager-ack-complete:'+a.id+':'+a.receipt.date,'Equipment Acknowledged',a.id+' · '+a.receipt.name,{type:'asset',id:a.id},'Normal',a.receipt.date);


}
return items.sort((a,b)=>Number(b.priority==='Action Required')-Number(a.priority==='Action Required')||(b.date||'').localeCompare(a.date||''));
}
