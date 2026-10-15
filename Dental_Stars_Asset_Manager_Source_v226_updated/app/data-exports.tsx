'use client';
import {useState} from 'react';
import {Download} from 'lucide-react';
import {readApiResponse} from './api-response';
import {todayPH} from './asset-model';

export default function DataExports(){
 const [busy,setBusy]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[dataset,setDataset]=useState('receipts');
 async function download(kind:string){setBusy(kind);setError('');setMessage('');try{
  const response=await fetch('/api/data-export?kind='+kind,{cache:'no-store'});
  if(!response.ok){const data=await readApiResponse(response);throw Error(data.error||'Unable to export records. Please retry.')}
  const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=url;
  link.download='Dental-Stars-'+(kind==='both'?'Registers':kind==='assets'?'Asset-Register':kind==='staff'?'Staff-Directory':kind)+'-'+todayPH()+(kind==='both'?'.zip':'.csv');document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);setMessage('Export prepared. Check your browser downloads.');
 }catch(e:any){setError(e.message)}finally{setBusy('')}}
 return <section className="dataexportsection" aria-labelledby="data-export-heading"><h3 id="data-export-heading">Data Export</h3><p>Download current equipment and staff records for Excel. Includes archived records, clearly marked; unused Asset IDs are excluded.</p><div className="actions"><button type="button" className="primary" disabled={!!busy} onClick={()=>download('both')}><Download size={16}/>{busy==='both'?'Preparing…':'Download Both (ZIP)'}</button><button type="button" className="secondary" disabled={!!busy} onClick={()=>download('assets')}>{busy==='assets'?'Preparing…':'Asset Register (CSV)'}</button><button type="button" className="secondary" disabled={!!busy} onClick={()=>download('staff')}>{busy==='staff'?'Preparing…':'Staff Directory (CSV)'}</button></div><div className="formgrid"><label>Additional Export<select value={dataset} disabled={!!busy} onChange={e=>setDataset(e.target.value)}>{[['receipts','Receipts'],['history','Equipment History'],['audits','Inventory Check Results'],['planning','Equipment Planning'],['summary','Management Summary'],['issuances','Equipment Issuance History']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div><button type="button" className="secondary" disabled={!!busy} onClick={()=>download(dataset)}><Download size={16}/>{busy===dataset?'Preparing…':'Download Selected CSV'}</button><small>Exports include all records in the selected dataset; working-page filters do not apply. Financial amounts are PHP. Administrators can download history, settings and uploaded files together from Backup &amp; Recovery.</small>{error&&<p className="error" role="alert">{error}</p>}{message&&<p className="success" role="status">{message}</p>}</section>
}
