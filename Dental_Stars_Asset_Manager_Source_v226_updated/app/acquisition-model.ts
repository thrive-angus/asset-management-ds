import {cents,validAmount} from './receipt-model';
export function acquisitionLabel(a:any){return ['Free Accessory','Promotional Credit','Accessory Allowance'].includes(a.acquisitionType)?'Accessory Allowance':'Purchased'}
export function allowancePayment(price:any,used:any){if(!validAmount(price)||!validAmount(used)||cents(used)>cents(price))return null;return (cents(price)-cents(used))/100}
export function allowanceError(price:any,used:any,remaining:number){if(!validAmount(price)||!validAmount(used))return 'Enter a valid Item Price and Covered by Free Accessory Benefit.';if(cents(used)>cents(price))return 'Covered by Free Accessory Benefit cannot exceed the Item Price.';if(cents(used)>cents(remaining))return 'Covered by Free Accessory Benefit exceeds the remaining receipt allowance. Reduce it; the balance will be Additional Amount Paid.';return ''}
export function recordedPurchaseCost(a:any){if(a.acquisitionType==='Free Accessory')return 0;return a.purchaseCost!==''&&a.purchaseCost!=null&&Number.isFinite(Number(a.purchaseCost))?Number(a.purchaseCost):null}
export function handoverDates(a:any,events:any[]){const dates=events.filter(e=>e.assetId===a.id&&(['Assigned','Reassigned','Transferred','Returned'].includes(e.action)||e.action==='Registered'&&e.after?.status==='Assigned')).map(e=>e.effectiveDate||e.details?.actualDate||e.after?.currentAssignmentDate||e.after?.lastReturnDate).filter(Boolean);return [...new Set([...dates,a.currentAssignmentDate,a.lastReturnDate].filter(Boolean))] as string[]}

export function matchingHandoverDates(a:any,events:any[],person:any=null,month=''){
 const matches=(record:any)=>record&&(record.staffId===person?.id||[person?.email,person?.name].filter(Boolean).some(v=>String(record.assignee||'').toLowerCase()===String(v).toLowerCase()));
 return [...new Set(events.filter(e=>e.assetId===a.id&&(['Assigned','Reassigned','Transferred','Returned'].includes(e.action)||e.action==='Registered'&&e.after?.status==='Assigned')&&(!person||matches(e.before)||matches(e.after))).map(e=>e.effectiveDate||e.details?.actualDate||e.after?.currentAssignmentDate||e.after?.lastReturnDate).filter(d=>d&&(!month||d.startsWith(month))))] as string[];
}

// Issue dates describe physical handovers, including older assignments entered later.
export function matchingIssuances(a:any,events:any[],person:any=null,month=''){
 const matches=(record:any)=>record&&(record.staffId===person?.id||[person?.email,person?.name].filter(Boolean).some(v=>String(record.assignee||'').toLowerCase()===String(v).toLowerCase()));
 return events.filter(e=>e.assetId===a.id&&(['Assigned','Reassigned','Transferred'].includes(e.action)||e.action==='Registered'&&e.after?.status==='Assigned')&&(!person||matches(e.after)))
  .map(e=>({...e,issuedDate:e.effectiveDate||e.details?.actualDate||e.after?.currentAssignmentDate||''}))
  .filter(e=>e.issuedDate&&(!month||e.issuedDate.startsWith(month))).sort((a,b)=>b.issuedDate.localeCompare(a.issuedDate));
}

export function allowanceCashError(price:any,benefit:any,cash:any){if(!validAmount(cash))return 'Enter Additional Amount Paid, including 0 when no cash was paid.';if(!validAmount(price)||!validAmount(benefit))return 'Enter Item Price and Covered by Free Accessory Benefit.';return cents(price)===cents(benefit)+cents(cash)?'':'Item Price must equal Covered by Free Accessory Benefit plus Additional Amount Paid. Enter the actual amounts.'}
