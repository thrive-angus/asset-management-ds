export const WORKSPACE_NAV = [
  { id: 'Overview', label: 'Home', description: 'Your workspace at a glance' },
  { id: 'Asset Register', label: 'Equipment', description: 'Equipment, receipts and checks' },
  { id: 'Staff & Handovers', label: 'People', description: 'Staff, handovers and login access' },
  { id: 'Equipment Follow-Ups', label: 'Activity', description: 'Follow-ups, tickets and notifications' },
  { id: 'Reports', label: 'Reports', description: 'Summaries and detailed reporting' },
] as const;

export const ACTIVITY_TABS = [
  { id: 'Equipment Follow-Ups', label: 'Follow-ups' },
  { id: 'Tickets', label: 'Tickets' },
  { id: 'Notifications', label: 'Notifications' },
  { id: 'Activity Log', label: 'History' },
] as const;

export function workspaceSection(tab: string): string {
  if (ACTIVITY_TABS.some(item => item.id === tab)) return 'Equipment Follow-Ups';
  if (tab === 'Inventory Checks') return 'Asset Register';
  return tab;
}

export function workspaceTitle(tab: string): string {
  const section = workspaceSection(tab);
  return WORKSPACE_NAV.find(item => item.id === section)?.label || tab;
}
