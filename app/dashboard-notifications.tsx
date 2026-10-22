'use client';
import {useState} from 'react';
import {Bell,ArrowUpRight} from 'lucide-react';
import {notificationTime} from './notification-time';

export type DashboardNotification={id:string;title:string;description:string;priority:string;date:string;read:boolean;target:{type:string;id:string;bundleId?:string}};
export default function DashboardNotifications({items,loading,onOpen,onViewAll}:{items:DashboardNotification[]|null;loading:boolean;onOpen:(item:DashboardNotification)=>Promise<void>;onViewAll:()=>void}){
 const [busy,setBusy]=useState(''),[error,setError]=useState('');
 const important=(items||[]).filter(item=>item.priority==='Action Required'||!item.read).sort((a,b)=>Number(b.priority==='Action Required')-Number(a.priority==='Action Required')||String(b.date||'').localeCompare(String(a.date||'')));
 async function open(item:DashboardNotification){setBusy(item.id);setError('');try{await onOpen(item)}catch(error){setError(error instanceof Error?error.message:'Unable to open this notification.')}finally{setBusy('')}}
 return <section className="homecard homenotifications" aria-labelledby="home-notifications-title" aria-busy={loading}>
  <div className="homeblockheading"><h2 id="home-notifications-title"><Bell size={17}/>Important notifications{!loading&&items!==null&&<span className="badge">{important.length}</span>}</h2><button type="button" className="assetlink" onClick={onViewAll}>View all notifications <ArrowUpRight size={14}/></button></div>
  <p className="homeequipmentnote">Action required and unread updates. Dates and times are shown in PHT. Opening a notification does not resolve its underlying issue.</p>
  {error&&<p className="error" role="alert">{error}</p>}
  {loading?<p className="homeempty" role="status">Loading notifications…</p>:items===null?<p className="homeempty" role="status">Notifications could not be loaded. Open all notifications to retry.</p>:important.length?<div className="homenotificationlist">{important.slice(0,5).map(item=>{const timestamp=notificationTime(item.date);return <button key={item.id} type="button" className="homenotification" disabled={!!busy} onClick={()=>open(item)}><span className="homenotificationbody"><span className="homenotificationmeta"><span className={item.priority==='Action Required'?'badge notificationrequired':'badge'}>{item.priority==='Action Required'?'Action required':'Update'}</span>{!item.read&&<span className="notificationnew">Unread</span>}</span><strong>{item.title}</strong><span>{item.description}</span>{timestamp?<time dateTime={timestamp.dateTime}>{timestamp.label} PHT</time>:<small>Time not recorded</small>}</span><ArrowUpRight size={17} aria-hidden="true"/></button>})}{important.length>5&&<p className="homequietnote">Showing 5 of {important.length} important notifications. View all notifications for the complete list.</p>}</div>:<p className="homeempty">No action-required or unread notifications right now.</p>}
 </section>;
}
