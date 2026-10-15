import {exportCsv} from './data-export-model';
import {receiptNumbers,receiptEntries,receiptTotals} from './receipt-model';
import {managementReport} from './management-report-model';
import {warrantyStatus,warrantyUntil} from './warranty-model';
import {auditFollowupStatus} from './audit-followup-model';

export function additionalExports(all:any[],staff:any[],events:any[],audits:any[],settings:any[]){
 const assets=all.filter(a=>!a.archived&&a.model&&a.category);
 const receiptRow=settings.find(r=>r.id==='receipt-register'),receipts=receiptRow?JSON.parse(receiptRow.data):[];
 const tickets=settings.filter(r=>r.id.startsWith('staff-request:')).map(r=>JSON.parse(r.data));
 const m=managementReport(assets,staff.filter(s=>!s.archived),events,audits,tickets);
 const summary=[['Registered Equipment',m.current.length],['Assigned Equipment',m.assigned.length],['Available Equipment',m.available.length],['Equipment Needing Action',m.attention],['Outstanding Returns',m.returns.length],['Inventory Discrepancies',m.latest?m.unresolved.length:''],['Recorded Purchase Cost (PHP)',m.costTotal]];
 return {
  receipts:exportCsv(['Receipt Code','Receipt Numbers','Suppliers','Budget Request Email Subject','Purchase Date','Amount Paid (PHP)','Benefit Provided (PHP)','Benefit Used (PHP)','Benefit Remaining (PHP)','Linked Equipment'],receipts.map((r:any)=>{const totals=receiptTotals(r,all);return [r.reference,receiptNumbers(r).join('; '),receiptEntries(r).map(e=>e.supplier).join('; '),r.budgetRequestSubject,r.purchaseDate,r.totalPaid,r.promotionalCredit,totals.creditUsed,totals.creditRemaining,totals.items.length]})),
  history:exportCsv(['Asset ID','Action','Date Effective','Recorded At','Recorded By','Previous Assignee','New Assignee','Status','Condition','Notes'],events.map(e=>[e.assetId,e.action,e.effectiveDate,e.date,e.recordedBy?.name||e.recordedBy,e.before?.assignee,e.after?.assignee,e.after?.status,e.after?.condition,e.after?.notes])),
  audits:exportCsv(['Audit','Status','Asset ID','Equipment','Equipment Type','Serial Number','Assigned To','Result','Verified At','Verified By','Follow-up','Resolution','Findings','Resolved By','Resolved At'],audits.flatMap(a=>(a.expected||[]).map((e:any)=>[a.name,a.status,e.id,e.model,e.category,e.serial,e.assignee,a.checked?.[e.id]?'Verified':'Not verified',a.checked?.[e.id]?.date,a.checked?.[e.id]?.recordedBy,auditFollowupStatus(a,e.id),a.resolutions?.[e.id]?.outcome,a.resolutions?.[e.id]?.note,a.resolutions?.[e.id]?.recordedBy,a.resolutions?.[e.id]?.date]))),
  planning:exportCsv(['Asset ID','Equipment','Equipment Type','Serial Number','Status','Amount Paid (PHP)','Warranty Status','Warranty Until','Replacement Date','Repair Problem','Repair Owner','Repair Cost (PHP)','Repair Progress','Repair Due','Repair Completed','Warranty Claim'],assets.map(a=>[a.id,a.model,a.category,a.serial,a.status,a.purchaseCost,warrantyStatus(a),warrantyUntil(a),a.replacementDate,a.repairProblem,a.repairOwner,a.repairCost,a.repairProgress,a.repairDueDate,a.repairCompletedDate,a.warrantyClaim])),
  summary:exportCsv(['Section','Metric / Issue','Value / Record','Owner','Due','Exported At'],[...summary.map(([metric,value])=>['Summary',metric,value,'','',new Date().toISOString()]),...m.decisions.map(d=>['Decisions Needed',d.issue,d.record,d.owner,d.due,new Date().toISOString()])]),
  issuances:exportCsv(['Date Issued','Asset ID','Equipment','Equipment Type','Serial Number','Issued To','Previous Holder','Recorded At','Recorded By'],events.filter(e=>['Assigned','Transferred'].includes(e.action)).map(e=>[e.after?.currentAssignmentDate||e.effectiveDate,e.assetId,e.after?.model,e.after?.category,e.after?.serial,staff.find(s=>s.id===e.after?.staffId||s.email===e.after?.assignee)?.name||e.after?.assignee,staff.find(s=>s.id===e.before?.staffId||s.email===e.before?.assignee)?.name||e.before?.assignee,e.date,e.recordedBy?.name]))
 };
}
