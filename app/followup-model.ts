import {warrantyCoverage} from './warranty-model';
import {recordGaps} from './report-model';
import {assignedTo,staffStatus} from './workflow-model';
import {todayPH} from './asset-model';
import {pendingStaffBundles} from './bundle-model';
import {acknowledgedEquipment} from './equipment-acknowledgement';
export const REVIEW_TYPES=['Warranty Review','Replacement Due'];
export function reviewSource(asset:any,type:string){return type==='Warranty Review'?String(asset.warrantyExpiry||'')+'|'+String(asset.warrantyCoverage||'Applicable'):String(asset.replacementDate||'')}
export function latestFollowupReview(asset:any,type:string,events:any[]){return events.filter(e=>e.assetId===asset.id&&e.action==='Follow-up reviewed'&&e.details?.type===type&&e.details?.source===reviewSource(asset,type)).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.id).localeCompare(String(a.id)))[0]}
export function reviewDue(asset:any,type:string,events:any[],today:string){if(asset.archived||asset.status==='Retired')return false;const due=type==='Warranty Review'?asset.warrantyExpiry:asset.replacementDate;if(!due||type==='Warranty Review'&&warrantyCoverage(asset)!=='Applicable')return false;if(due>new Date(Date.parse(today+'T00:00:00Z')+60*86400000).toISOString().slice(0,10))return false;const review=latestFollowupReview(asset,type,events);return !review||review.details.outcome==='Action Pending'||!review.details.nextReviewDate||review.details.nextReviewDate<=today}
export function outstandingStaff(staff:any[],assets:any[]){return staff.filter(s=>(staffStatus(s)==='Inactive'||s.stage==='Offboarding'||s.end&&s.end<=todayPH())&&assets.some(a=>assignedTo(a,s)))}
export function attentionGroups(assets:any[],staff:any[],audits:any[],events:any[]=[],requests:any[]=[],today=todayPH()):[string,any[]][]{
 const current=assets.filter(a=>!a.archived),completed=audits.filter(a=>a.status==='Completed').sort((a,b)=>String(b.completed||b.date).localeCompare(String(a.completed||a.date)));
 return [['Incomplete Bundles',pendingStaffBundles(current,staff,events).map(b=>({...b,id:b.staffId+':'+b.bundleId}))],['Outstanding Returns',outstandingStaff(staff,current)],['Repairs',current.filter(a=>a.status==='Under repair')],['Damaged Equipment',current.filter(a=>!['Under repair','Retired','Lost'].includes(a.status)&&['Damaged','Not working'].includes(a.condition))],['Lost Equipment',current.filter(a=>a.status==='Lost')],['Inventory Findings',completed.map(a=>({...a,pendingCount:a.expected?.filter((e:any)=>!a.checked?.[e.id]&&!a.resolutions?.[e.id]).length||0})).filter(a=>a.pendingCount)],['Acknowledgement Pending',current.filter(a=>a.status==='Assigned'&&!acknowledgedEquipment(a))],['Warranty Review',current.filter(a=>reviewDue(a,'Warranty Review',events,today))],['Replacement Due',current.filter(a=>reviewDue(a,'Replacement Due',events,today))],['Open Equipment Tickets',requests.filter(r=>r.status==='Open')],['Incomplete Records',current.filter(a=>recordGaps(a,staff).length)]];
}
