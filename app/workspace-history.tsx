'use client';
import { useState } from 'react';
import EventHistory from './event-history';

type Movement = {id:string;assetId:string;date:string;effectiveDate?:string;action:string;recordedBy?:{name?:string};before?:{assignee?:string};after?:{assignee?:string}};
type Person = {id:string;name:string;email:string};
export default function WorkspaceHistory({events,staff,onAsset,onStaff,assetExists}:{events:Movement[];staff:Person[];onAsset:(id:string)=>void;onStaff:(email:string)=>void;assetExists:(id:string)=>boolean}) {
  const [query,setQuery]=useState(''),[action,setAction]=useState('All actions'),[from,setFrom]=useState(''),[to,setTo]=useState('');
  const filtered=events.filter(event=>{
    const day=event.effectiveDate||event.date.slice(0,10);
    return (action==='All actions'||event.action===action)&&(!from||day>=from)&&(!to||day<=to)&&[event.assetId,event.action,event.recordedBy?.name,event.before?.assignee,event.after?.assignee].some(value=>(value||'').toLowerCase().includes(query.toLowerCase()));
  }).sort((a,b)=>b.date.localeCompare(a.date));
  return <div className="panel report workspacehistory"><div className="homeblockheading"><div><h2>Equipment history</h2><p className="workspacecontext">Review movements and the people behind each change.</p></div></div><div className="reportfilterbox workspacehistoryfilters"><label>Search<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Equipment ID, person or action"/></label><label>Action<select value={action} onChange={event=>setAction(event.target.value)}>{['All actions',...new Set(events.map(event=>event.action))].map(value=><option key={value}>{value}</option>)}</select></label><label>From<input type="date" value={from} onChange={event=>setFrom(event.target.value)}/></label><label>To<input type="date" min={from||undefined} value={to} onChange={event=>setTo(event.target.value)}/></label>{(query||action!=='All actions'||from||to)&&<button type="button" className="secondary" onClick={()=>{setQuery('');setAction('All actions');setFrom('');setTo('')}}>Clear filters</button>}</div><EventHistory events={filtered} staff={staff} onAsset={onAsset} assetExists={assetExists} onStaff={onStaff} staffExists={email=>staff.some(person=>person.email.toLowerCase()===email.toLowerCase())}/></div>;
}
