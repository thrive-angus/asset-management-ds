'use client';
import HelpTip from './help-tip';
import PaginatedTable from './paginated-table';
import {useState} from 'react';
import {Download} from 'lucide-react';
import {Staff,assignedTo} from './workflow-model';

export default function StaffEquipmentHistory({staff,events}:{staff:Staff;events:any[]}){
const [page,setPage]=useState(0);
const history=events.filter(e=>e.before&&assignedTo(e.before,staff)||e.after&&assignedTo(e.after,staff)).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.id).localeCompare(String(a.id)));
const pages=Math.max(1,Math.ceil(history.length/20)),current=Math.min(page,pages-1);
function action(e:any){const before=e.before&&assignedTo(e.before,staff),after=e.after&&assignedTo(e.after,staff);if(!before&&after)return 'Assigned';if(before&&!after&&e.after?.status==='Assigned')return 'Reassigned to another staff member';return e.action||'Updated'}
return <div className="workflowsection staffequipmenthistory"><div className="historyhead"><div><h3>Assignment & Return History <HelpTip text={"History of equipment assigned to, transferred to or from, and returned by this staff member."}/></h3></div></div><div className="tablewrap" tabIndex={0} role="region" aria-label="Staff equipment history"><PaginatedTable><thead><tr>{['Asset ID','Equipment','Equipment Type','Serial Number','Action','Transaction Date','Condition','Recorded By'].map(v=><th scope="col" key={v}>{v}</th>)}</tr></thead><tbody>{history.map(e=><tr key={e.id}><td>{e.assetId}</td><td>{e.after?.model||e.before?.model||e.assetId}</td><td>{e.after?.category||e.before?.category||'—'}</td><td>{e.after?.serial||e.before?.serial||'—'}</td><td>{action(e)}{e.action==='Reassigned'&&<small>{assignedTo(e.before,staff)?staff.name:e.before?.assignee||'Unassigned'} → {assignedTo(e.after,staff)?staff.name:e.after?.assignee||'Unassigned'}</small>}</td><td>{e.effectiveDate||'Not recorded'}</td><td>{e.after?.condition||'Not recorded'}</td><td>{e.recordedBy?.name||'Not recorded'}<small>{e.date?new Date(e.date).toLocaleString('en-PH',{timeZone:'Asia/Manila'}):'Timestamp not recorded'}</small></td></tr>)}{!history.length&&<tr><td colSpan={8}>No equipment assigned to this staff member yet.</td></tr>}</tbody></PaginatedTable></div></div>
}
