'use client';
import type { ReactNode } from 'react';
import { ArrowUpRight, Plus, Users, ScanLine, ArrowLeftRight, Package, CheckCircle2, Bell } from 'lucide-react';
import type {EquipmentAvailability} from './equipment-availability';

type Event = { id: string; assetId: string; date: string; action: string; recordedBy?: { name?: string } };
type Props = {
  name?: string; loading: boolean; canManage: boolean; total: number; assigned: number; available: number; people: number;
  followups: number | null; tickets: number | null; notifications: number | null; events: Event[];
  equipmentBreakdown?: EquipmentAvailability[];
  onEquipment: (scope: string, category?:string) => void; onPeople: () => void; onAddEquipment: () => void; onAddPerson: () => void;
  onScan: () => void; onActivity: (tab: string) => void; onReports: () => void; onAsset: (id: string) => void;
  children: ReactNode;
};

export default function WorkspaceHome(props: Props) {
  const { loading, canManage } = props;
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
    { label: 'Unread notifications', value: props.notifications, tab: 'Notifications', note: 'Catch up on recent updates' },
  ];
  return <div className="workspacehome">
    <div className="homewelcome"><div><span className="eyebrow">YOUR WORKSPACE</span><h1>{props.name ? `Welcome, ${props.name.split(' ')[0]}.` : 'Welcome back.'}</h1><p>Keep equipment moving and your team connected.</p></div><span className="homeworkspacebadge"><span className="dot"/>Dental Stars</span></div>
    <section className="homequickstart" aria-labelledby="quick-start-title"><div className="homeblockheading"><h2 id="quick-start-title">What would you like to do?</h2><span>Start with a task</span></div><div className="hometasks">{tasks.map(({ label, note, icon: Icon, action }) => <button key={label} type="button" onClick={()=>action()} disabled={loading}><span className="hometaskicon"><Icon size={21}/></span><span><strong>{label}</strong><small>{note}</small></span><ArrowUpRight size={17}/></button>)}</div></section>
    <div className="homemetrics" aria-label="Workspace summary">{metrics.map(metric => <button type="button" key={metric.label} onClick={metric.action} disabled={loading}><span>{metric.label}<ArrowUpRight size={15}/></span><strong>{loading ? '—' : metric.value}</strong><small>{metric.note}</small></button>)}</div>
    <section className="homecard homeequipment" aria-labelledby="equipment-availability-title" aria-busy={loading}>
      <div className="homeblockheading"><h2 id="equipment-availability-title"><Package size={17}/>Equipment availability</h2><button type="button" className="assetlink" onClick={()=>props.onEquipment('All')} disabled={loading}>View equipment <ArrowUpRight size={14}/></button></div>
      <p className="homeequipmentnote">Available means ready to assign, including usable returned items. Select a count to view its equipment.</p>
      {loading?<p className="homeempty" role="status">Loading equipment counts…</p>:props.equipmentBreakdown?.length?<div className="homeequipmentgrid">{props.equipmentBreakdown.map(item=><article className="homeequipmenttype" key={item.category}><h3>{item.category}</h3>{item.registered===0?<p className="homeequipmentempty">No equipment registered yet</p>:<div className="homeequipmentcounts"><button type="button" onClick={()=>props.onEquipment('Ready',item.category)} aria-label={`View available ${item.category}: ${item.available}`}><span><i className="availabilitydot"/>Available</span><strong>{item.available}</strong></button><button type="button" onClick={()=>props.onEquipment('Assigned',item.category)} aria-label={`View assigned ${item.category}: ${item.assigned}`}><span><i className="availabilitydot assigned"/>Assigned</span><strong>{item.assigned}</strong></button></div>}</article>)}</div>:<p className="homeempty">Equipment counts will appear here once items are registered.</p>}
    </section>
    <div className="homecolumns"><section className="homecard" aria-labelledby="attention-title"><div className="homeblockheading"><h2 id="attention-title"><Bell size={17}/>Needs attention</h2></div><div className="homeattention">{attention.map(item => <button type="button" key={item.tab} onClick={() => props.onActivity(item.tab)}><span><strong>{item.label}</strong><small>{item.note}</small></span><b className={item.value ? 'attentionvalue' : ''}>{loading || item.value === null ? '—' : item.value}</b><ArrowUpRight size={16}/></button>)}</div><p className="homequietnote"><CheckCircle2 size={15}/>Open a category to review its supporting records.</p></section>
    <section className="homecard" aria-labelledby="recent-title"><div className="homeblockheading"><h2 id="recent-title">Recent activity</h2><button type="button" className="assetlink" onClick={() => props.onActivity('Activity Log')}>View history <ArrowUpRight size={14}/></button></div><div className="homerecent">{[...props.events].sort((a,b) => b.date.localeCompare(a.date)).slice(0,4).map(event => <button type="button" key={event.id} onClick={() => props.onAsset(event.assetId)}><span className="homerecenticon"><Package size={17}/></span><span><strong>{event.action}</strong><small>{event.assetId}{event.recordedBy?.name ? ` · ${event.recordedBy.name}` : ''}</small></span><time dateTime={event.date}>{new Date(event.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</time></button>)}{!props.events.length&&<p className="homeempty">Equipment movements will appear here as your team works.</p>}</div></section></div>
    <details className="homebreakdown"><summary>Detailed equipment and staff breakdown<span>All status counts and pending actions</span></summary><div className="homebreakdowncontent">{props.children}</div></details>
  </div>;
}
