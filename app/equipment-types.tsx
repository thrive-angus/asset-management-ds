'use client';
import {useState} from 'react';
import HelpTip from './help-tip';
import PaginatedTable from './paginated-table';
import {readApiResponse} from './api-response';
export default function EquipmentTypes({types,refresh}:{types:string[],refresh:()=>Promise<void>}){
 const [name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const duplicate=types.some(t=>t.toLowerCase()===name.trim().replace(/\s+/g,' ').toLowerCase());
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');setMessage('');try{const result=await readApiResponse(await fetch('/api/equipment-types',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})}));setName('');setMessage(result.name+' added. You can now select it when registering equipment or creating a bundle.');await refresh()}catch(e:any){setError(e.message)}finally{setBusy(false)}}
 return <section className="panel report"><h2>Equipment Types <HelpTip text="Manage the category list before buying equipment. Adding a type does not create an equipment record, available stock or an audit item."/></h2><form onSubmit={save} className="equipmenttypeform"><label htmlFor="equipment-type-name">Equipment Type<input id="equipment-type-name" required maxLength={60} disabled={busy} value={name} placeholder="e.g. Camera" onChange={e=>{setName(e.target.value);setMessage('');setError('')}}/></label><button type="submit" className="primary" disabled={busy||!name.trim()||duplicate}>{busy?'Saving…':'Add Equipment Type'}</button></form>{duplicate&&<p className="hint">This equipment type is already in the list.</p>}{error&&<p className="error" role="alert">{error}</p>}{message&&<p className="success" role="status">{message}</p>}<div className="tablewrap"><PaginatedTable paginationKey="equipment-types"><thead><tr><th>Equipment Type</th></tr></thead><tbody>{[...types].sort((a,b)=>a.localeCompare(b)).map(type=><tr key={type}><td>{type}</td></tr>)}</tbody></PaginatedTable></div></section>
}
