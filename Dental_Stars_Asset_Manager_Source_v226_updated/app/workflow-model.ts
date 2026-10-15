export type Staff={id:string;name:string;firstName?:string;lastName?:string;email:string;role:string;start:string;end:string;stage:string;on:Record<string,boolean>;off:Record<string,boolean>;notes:string;employmentStatus?:'Active'|'Inactive';updated?:string};
export const ON_TASKS=[['accounts','Confirm required work and client accounts are ready'],['orientation','Explain equipment care, confidentiality and incident reporting'],['handover','Record equipment handover acknowledgment']];
export const OFF_TASKS=[['handover','Complete work and client handover'],['access','Confirm work and client access has been removed']];
export function assignedTo(asset:any,staff:Staff){return asset.status==='Assigned'&&(asset.staffId===staff.id||asset.assignee?.toLowerCase()===staff.email.toLowerCase()||asset.assignee?.toLowerCase()===staff.name.toLowerCase())}
export function completionError(staff:Staff,assets:any[]){if(staff.stage==='Offboarded'){if(!staff.end)return 'Enter the final working date before closing clearance.';if(assets.some(a=>assignedTo(a,staff)))return 'Return or reassign all outstanding equipment before closing clearance.'}return null}

export function stageLabel(stage:string){return ({Onboarding:"Registered",Active:"Handover confirmed",Offboarding:"Return started",Offboarded:"Return completed"} as Record<string,string>)[stage]||stage}
export function handoverLabel(s:Staff,assets:any[],events:any[]){if(assets.some(a=>assignedTo(a,s)))return 'Assigned';if(events.some(e=>e.before&&assignedTo(e.before,s)&&['Returned','Available','Under repair'].includes(e.after?.status)))return 'Returned';if(s.stage==='Offboarded'||events.some(e=>e.before&&assignedTo(e.before,s)||e.after&&assignedTo(e.after,s)))return 'Unassigned';return 'Registered'}

export function staffStatus(s:Staff):'Active'|'Inactive'{return s.employmentStatus||(s.stage==='Offboarded'?'Inactive':'Active')}
