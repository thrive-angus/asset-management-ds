'use client';
import {useState,type ReactNode} from 'react';
import { ArrowUpRight, Plus, Users, ScanLine, ArrowLeftRight, Package, CheckCircle2, Bell } from 'lucide-react';
import type {EquipmentAvailability} from './equipment-availability';
import DashboardNotifications,{type DashboardNotification} from './dashboard-notifications';
import './home-organized.css';

type Event = { id: string; assetId: string; date: string; action: string; recordedBy?: { name?: string } };
type Props = {
  name?: string; loading: boolean; canManage: boolean; total: number; assigned: number; available: number; people: number;
  followups: number | null; tickets: number | null; notifications: number | null; events: Event[];
  equipmentBreakdown?: EquipmentAvailability[];
  notificationItems:DashboardNotification[]|null;notificationsLoading:boolean;onOpenNotification:(item:DashboardNotification)=>Promise<void>;
  onEquipment: (scope: string, category?:string) => void; onPeople: () => void; onAddEquipment: () => void; onAddPerson: () => void;
  onScan: () => void; onActivity: (tab: string) => void; onReports: () => void; onAsset: (id: string) => void;
  children: ReactNode;
};

export default function WorkspaceHome(props: Props) {
  const { loading, canManage } = props;
  const [showAllTypes,setShowAllTypes]=useState(false);
  const registeredTypes=(props.equipmentBreakdown||[]).filter(item=>item.registered>0);
  const emptyTypes=(props.equipmentBreakdown||[]).filter(item=>item.registered===0);
  const visibleTypes=showAllTypes?registeredTypes:registeredTypes.slice(0,6);
  const metrics = [
    { label: 'Equipment', value: props.total, note: 'All registered items', action: () => props.onEquipment('All') },
    { label: 'Assigned', value: props.assigned, note: 'Currently with your team', action: () => props.onEquipment('Assigned') },
    { label: 'Ready to assign', value: props.available, note: 'Available and usable', action: () => props.onEquipment('Ready') },
    { label: 'People', value: props.people, note: 'Staff directory', action: props.onPeople },
  ];
  const tasks = canManage ? [
    { label: 'Add equipment', note: 'Register a new item', icon: Plus, action: props.onAddEquipment },
    { label: 'Add a person', note: 'Reuse an existing login', icon: Users, action: props.onAddPerson },
    { label: 'Assign or return', note: 'Open a person’s equipment', icon: ArrowLeftRight, action: props.onPeople },
    { label: 'Scan a label', note: 'Find an item by its code', icon: ScanLine, action: props.onScan },
  ] : [
    { label: 'Browse equipment', note: 'Find an item or assignment', icon: Package, action: () => props.onEquipment('All') },
    { label: 'Find a person', note: 'View staff and equipment', icon: Users, action: props.onPeople },
    { label: 'View reports', note: 'Explore your equipment data', icon: ArrowUpRight, action: props.onReports },
    { label: 'Scan a label', note: 'Open an equipment record', icon: ScanLine, action: props.onScan },
  ];
  const attention = [
    { label: 'Equipment follow-ups', value: props.followups, tab: 'Equipment Follow-Ups', note: 'Review items needing attention' },
    { label: 'Open tickets', value: props.tickets, tab: 'Tickets', note: 'Check reported equipment issues' },
  ];
  return <div className="workspacehome homeorganized">
    <div className="homewelcome"><div><span className="eyebrow">WORKSPACE OVERVIEW</span><h1>{props.name ? `Welcome, ${props.name.split(' ')[0]}.` : 'Welcome back.'}</h1><p>Your equipment, team and priorities at a glance.</p></div><section className="homequickstart" aria-labelledby="quick-start-title"><h2 id="quick-start-title">Quick actions</h2><div className="hometasks">{tasks.map(({label,note,icon:Icon,action})=><button key={label} type="button" onClick={()=>action()} disabled={loading} title={note}><Icon size={17}/><strong>{label}</strong></button>)}</div></section></div>
    <div className="homemetrics" aria-label="Workspace summary">{metrics.map(metric=><button type="button" key={metric.label} onClick={metric.action} disabled={loading}><span>{metric.label}<ArrowUpRight size={15}/></span><strong>{loading?'—':metric.value}</strong><small>{metric.note}</small></button>)}</div>
    <div className="homefocusgrid">
      <DashboardNotifications limit={3} items={props.notificationItems} loading={props.notificationsLoading} onOpen={props.onOpenNotification} onViewAll={()=>props.onActivity('Notifications')}/>
      <section className="homecard" aria-labelledby="attention-title"><div className="homeblockheading"><h2 id="attention-title"><Bell size={17}/>Follow-ups</h2></div><div className="homeattention">{attention.map(item=><button type="button" key={item.tab} onClick={()=>props.onActivity(item.tab)}><span><strong>{item.label}</strong><small>{item.note}</small></span><b className={item.value?'attentionvalue':''}>{loading||item.value===null?'—':item.value}</b><ArrowUpRight size={16}/></button>)}</div><p className="homequietnote"><CheckCircle2 size={15}/>Review and resolve items in their supporting records.</p></section>
    </div>
    <div className="homedetailgrid">
      <section className="homecard homeequipment" aria-labelledby="equipment-availability-title" aria-busy={loading}>
        <div className="homeblockheading"><h2 id="equipment-availability-title"><Package size={17}/>Equipment availability</h2><button type="button" className="assetlink" onClick={()=>props.onEquipment('All')} disabled={loading}>View equipment <ArrowUpRight size={14}/></button></div>
        <p className="homeequipmentnote">Available includes usable returned items. Select a count to view equipment.</p>
        {loading?<p className="homeempty" role="status">Loading equipment counts…</p>:<>
          {registeredTypes.length?<><div className="homeavailabilityhead" aria-hidden="true"><span>Equipment type</span><span>Available</span><span>Assigned</span></div><div className="homeequipmentgrid">{visibleTypes.map(item=><article className="homeequipmenttype" key={item.category}><h3>{item.category}</h3><div className="homeequipmentcounts"><button type="button" onClick={()=>props.onEquipment('Ready',item.category)} aria-label={`View available ${item.category}: ${item.available}`}><strong>{item.available}</strong></button><button type="button" onClick={()=>props.onEquipment('Assigned',item.category)} aria-label={`View assigned ${item.category}: ${item.assigned}`}><strong>{item.assigned}</strong></button></div></article>)}</div>{registeredTypes.length>6&&<button type="button" className="assetlink homeexpandtypes" aria-expanded={showAllTypes} onClick={()=>setShowAllTypes(value=>!value)}>{showAllTypes?'Show fewer types':`Show all ${registeredTypes.length} registered types`}</button>}</>:<p className="homeempty">No equipment registered yet.</p>}
          {emptyTypes.length>0&&<div className="homeunregistered"><span>Not registered yet</span><div>{emptyTypes.map(item=><button key={item.category} type="button" onClick={()=>props.onEquipment('All',item.category)} aria-label={`View ${item.category}: no equipment registered yet`}>{item.category}</button>)}</div></div>}
        </>}
      </section>
      <section className="homecard" aria-labelledby="recent-title"><div className="homeblockheading"><h2 id="recent-title">Recent activity</h2><button type="button" className="assetlink" onClick={()=>props.onActivity('Activity Log')}>View history <ArrowUpRight size={14}/></button></div><div className="homerecent">{[...props.events].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3).map(event=><button type="button" key={event.id} onClick={()=>props.onAsset(event.assetId)}><span className="homerecenticon"><Package size={16}/></span><span><strong>{event.action}</strong><small>{event.assetId}{event.recordedBy?.name?' · '+event.recordedBy.name:''}</small></span><time dateTime={event.date}>{new Date(event.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</time></button>)}{!props.events.length&&<p className="homeempty">Equipment movements will appear here.</p>}</div></section>
    </div>
    <details className="homebreakdown"><summary>Detailed equipment and staff breakdown<span>All status counts and pending actions</span></summary><div className="homebreakdowncontent">{props.children}</div></details>
  </div>;
}