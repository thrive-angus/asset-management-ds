'use client';
import {useState,type ReactNode} from 'react';
import {ArrowLeft,Printer,Pencil,MoreHorizontal,Package} from 'lucide-react';
import {CurrencySwitcher,useMoney} from './currency-display';
import {warrantyStatus} from './warranty-model';
import {acquisitionLabel} from './acquisition-model';
import {acknowledgedEquipment} from './equipment-acknowledgement';
import type {Asset} from './asset-app';
import type {Staff} from './workflow-model';
import './equipment-record-page.css';

type Section='Summary'|'Assignment & Returns'|'Purchase & Maintenance'|'Documents'|'History';
const SECTIONS:Section[]=['Summary','Assignment & Returns','Purchase & Maintenance','Documents','History'];
type Props={asset:Asset;staff:Staff[];canManage:boolean;isAdmin:boolean;editing:boolean;saving:boolean;dirty:boolean;error:string;message:string;backLabel:string;
 onBack:()=>void;onEdit:()=>void;onCancel:()=>void;onPrint:()=>void;onDelete:()=>void;onReceipt:(reference:string)=>void;
 editor:ReactNode;assignment:ReactNode;documents:ReactNode;history:ReactNode;related:ReactNode};
function day(value:unknown){
 if(typeof value!=='string'||!value)return '—';
 if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
 const date=new Date(value);
 return Number.isFinite(date.valueOf())?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(date):'—';
}
function ValueList({items}:{items:[string,ReactNode][]}){return <dl className="equipmentrecordvalues">{items.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'—'}</dd></div>)}</dl>}

export default function EquipmentRecordPage(props:Props){
 const {asset,editing,saving}=props,{money}=useMoney();
 const [section,setSection]=useState<Section>('Summary');
 const person=props.staff.find(s=>s.id===asset.staffId||asset.assignee&&s.email?.toLowerCase()===asset.assignee.toLowerCase());
 const amount=(value:unknown)=>value!==''&&value!=null&&Number.isFinite(Number(value))?money(Number(value)):'—';
 return <article className="equipmentrecordpage" aria-labelledby="equipment-record-heading">
  <button type="button" className="assetlink equipmentrecordback" disabled={saving} onClick={props.onBack}><ArrowLeft size={17}/>{props.backLabel}</button>
  <header className="equipmentrecordheader"><div><span className="eyebrow">EQUIPMENT RECORD</span><h1 id="equipment-record-heading" tabIndex={-1}>{asset.id}</h1><p>{asset.category} · {asset.model}</p><div className="equipmentrecordbadges"><span className="badge">{asset.status}</span><span>{asset.condition}</span><span>{asset.status==='Assigned'?(person?.name||asset.assignee||'Assignment not recorded'):'Unassigned'}</span></div></div>
   <div className="equipmentrecordactions"><CurrencySwitcher/><button type="button" className="secondary" disabled={saving} onClick={props.onPrint}><Printer size={16}/>Print label</button>{props.canManage&&!editing&&<button type="button" className="primary" onClick={()=>{setSection('Summary');props.onEdit()}}><Pencil size={16}/>Edit details</button>}{props.isAdmin&&!editing&&<details className="equipmentrecordmore"><summary aria-label="More equipment actions"><MoreHorizontal size={20}/><span>More actions</span></summary><div><button type="button" className="dangerbutton" disabled={saving} onClick={props.onDelete}>Delete record</button></div></details>}</div>
  </header>
  {props.error&&!editing&&<p className="error" role="alert">{props.error}</p>}{props.message&&<p className="success" role="status">{props.message}</p>}
  {editing?<section className="equipmentrecordeditor" aria-label="Edit equipment details"><div className="equipmentrecordeditnotice"><h2>Edit equipment details</h2><p>Save your changes before transferring, returning or attaching documents.</p></div>{props.editor}<div className="equipmentrecordsavebar"><span role="status">{props.dirty?'Unsaved changes':'Equipment details'}</span><button type="button" className="secondary" disabled={saving} onClick={props.onCancel}>Cancel edits</button><button type="submit" form="asset-record-form" className="primary" disabled={saving}>{saving?'Saving…':'Save changes'}</button></div></section>:<>
   <nav className="equipmentrecordtabs" aria-label="Equipment record sections">{SECTIONS.map(name=><button type="button" key={name} aria-current={section===name?'page':undefined} aria-controls={'equipment-section-'+name.split(' ')[0].toLowerCase()} className={section===name?'active':''} onClick={()=>setSection(name)}>{name}</button>)}</nav>
   <section id="equipment-section-summary" className="equipmentrecordsection" hidden={section!=='Summary'} aria-label="Equipment summary"><div className="equipmentrecordsectionheading"><h2><Package size={19}/>Equipment summary</h2></div><ValueList items={[
    ['Equipment type',asset.category],['Brand / model',asset.model],['Serial number',asset.serial],['Location',asset.location],['Condition',asset.condition],['Previous owner',asset.previousOwner],['Assigned to',asset.status==='Assigned'?(person?.name||asset.assignee):'Unassigned'],['Acknowledgement',asset.status==='Assigned'?(acknowledgedEquipment(asset)?'Acknowledged':'Awaiting acknowledgement'):'Not applicable'],['Date issued',day(asset.currentAssignmentDate)],['Last returned',day(asset.lastReturnDate)],['Last verified',day(asset.lastVerified)],
   ]}/>{asset.notes&&<div className="equipmentrecordnotes"><h3>Notes</h3><p>{asset.notes}</p></div>}{props.related}</section>
   <section id="equipment-section-assignment" className="equipmentrecordsection" hidden={section!=='Assignment & Returns'} aria-label="Assignment and returns"><h2>Assignment &amp; Returns</h2>{asset.status!=='Assigned'&&<p className="hint">This equipment is currently unassigned.{props.canManage?' Use Edit details to record a new assignment.':''}</p>}{props.assignment}</section>
   <section id="equipment-section-purchase" className="equipmentrecordsection" hidden={section!=='Purchase & Maintenance'} aria-label="Purchase and maintenance"><h2>Purchase &amp; Maintenance</h2><ValueList items={[
    ['Purchase date',day(asset.purchase)],['Acquisition',acquisitionLabel(asset)],['Purchase cost',amount(asset.purchaseCost)],['Item value',amount(asset.itemValue)],['Accessory allowance used',amount(asset.promotionalCreditUsed)],['Receipt',asset.receiptReference?<button type="button" className="assetlink" onClick={()=>props.onReceipt(asset.receiptReference)}>{asset.receiptReference}</button>:null],['Additional payment receipt',asset.topUpReceiptReference?<button type="button" className="assetlink" onClick={()=>props.onReceipt(asset.topUpReceiptReference)}>{asset.topUpReceiptReference}</button>:null],['Included with',asset.includedWithAssetId],['Warranty',warrantyStatus(asset)],['Warranty expiry',day(asset.warrantyExpiry)],['Planned replacement',day(asset.replacementDate)],
   ]}/><h3>Repair tracking</h3><ValueList items={[
    ['Reported problem',asset.repairProblem],['Repair owner / vendor',asset.repairOwner],['Progress',asset.repairProgress],['Repair cost',amount(asset.repairCost)],['Expected completion',day(asset.repairDueDate)],['Completed date',day(asset.repairCompletedDate)],['Warranty claim',asset.warrantyClaim],
   ]}/></section>
   <section id="equipment-section-documents" className="equipmentrecordsection" hidden={section!=='Documents'} aria-label="Equipment documents"><h2>Documents &amp; Inspections</h2>{asset.receiptReference&&<p className="hint">Purchase receipt: <button type="button" className="assetlink" onClick={()=>props.onReceipt(asset.receiptReference)}>{asset.receiptReference}</button></p>}{props.documents}</section>
   <section id="equipment-section-history" className="equipmentrecordsection" hidden={section!=='History'} aria-label="Equipment history"><h2>Equipment history</h2>{props.history}</section>
  </>}
 </article>;
}
