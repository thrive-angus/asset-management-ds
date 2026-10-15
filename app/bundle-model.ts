export const MISSING_BUNDLE_REASONS=['Out of Stock','Purchase Pending','Awaiting Return','Under Repair','Awaiting Registration','Issuance Deferred'] as const;
import {assignedTo} from './workflow-model';
import {usable} from './asset-model';
export function bundlePlan(types:string[],assets:any[],person:any){
 const unique=[...new Map(types.filter(Boolean).map(type=>[type.trim().toLowerCase(),type.trim()])).values()];
 return unique.map(type=>{const matches=assets.filter(a=>!a.archived&&String(a.category||'').trim().toLowerCase()===type.toLowerCase());const held=matches.find(a=>assignedTo(a,person));const available=matches.filter(usable).sort((a,b)=>a.id.localeCompare(b.id));return {type,held,asset:held?undefined:available[0],availableCount:available.length}});
}
export function missingBundleTypes(plan:ReturnType<typeof bundlePlan>,selected:string[]){return plan.filter(row=>!row.held&&(!row.asset||!selected.includes(row.asset.id))).map(row=>row.type)}
// Handover snapshots keep incomplete bundles traceable even if a template is deleted.
export function pendingStaffBundles(assets:any[],staff:any[],events:any[]){
 const latest=new Map<string,any>();
 for(const event of [...events].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(a.id||'').localeCompare(String(b.id||'')))){
  const b=event.bundleDetails,id=event.after?.staffId;
  if(!b?.id||!id||!Array.isArray(b.types))continue;
  const key=id+':'+b.id;if(latest.has(key))continue;latest.set(key,{event,b,id});
 }
 return [...latest.values()].flatMap(({event,b,id})=>{
  const person=staff.find(p=>p.id===id&&!p.archived&&p.employmentStatus!=='Inactive'&&p.stage!=='Offboarded');
  if(!person||b.status!=='Incomplete')return [];
  const outstanding=Array.isArray(b.missingTypes)?b.missingTypes:b.types;
  const issuedSince=(type:string)=>events.some(e=>String(e.date||'')>=String(event.date||'')&&e.after?.status==='Assigned'&&(e.after.staffId===id||String(e.after.assignee||'').toLowerCase()===person.email.toLowerCase())&&String(e.after.category||'').toLowerCase()===type.toLowerCase());
  // One bundle issuance records an event per asset at the same timestamp.
  // Reasons may reference any sibling event, so match the whole issuance batch.
  const batchIds=new Set(events.filter(e=>e.date===event.date&&e.after?.staffId===id&&e.bundleDetails?.id===b.id).map(e=>e.id));
  const reasonUpdate=[...events].filter(e=>batchIds.has(e.bundleReasonUpdate?.handoverId)&&e.bundleReasonUpdate?.staffId===id&&e.bundleReasonUpdate?.bundleId===b.id).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.id).localeCompare(String(a.id)))[0];
  const reasons=reasonUpdate?.bundleReasonUpdate?.missingReasons||b.missingReasons||{};
  const plan=bundlePlan(outstanding,assets,person),missing=plan.filter(p=>!p.held&&!issuedSince(p.type)).map(p=>({type:p.type,asset:p.asset,reason:reasons[p.type]||'Not Recorded'}));
  return missing.length?[{handoverId:reasonUpdate?.bundleReasonUpdate?.handoverId||event.id,reasonRevision:reasonUpdate?.id||event.id,staffId:id,staffName:person.name,bundleId:b.id,name:b.name,types:b.types,missing,date:event.date,notificationId:'bundle-pending:'+id+':'+b.id+':'+missing.map(p=>p.type).join('|')}]:[];
 });
}

export function missingBundleNextStep(reason:string){return ({
 'Out of Stock':'Check usable stock first. If a purchase is needed, follow company approval, receive the item, then register it.',
 'Purchase Pending':'Follow up on the approved order. Register the equipment after it is received.',
 'Awaiting Return':'Follow up with the current holder. Record an inspected return before reissuing the equipment.',
 'Under Repair':'Follow up on the repair. Update the equipment as usable and available after inspection.',
 'Awaiting Registration':'Register the physical equipment with its Asset ID, type and condition.',
 'Issuance Deferred':'Confirm when the equipment is needed with the staff member, then issue it on the agreed date.'
} as Record<string,string>)[reason]||'Select a reason to see the next step.'}
