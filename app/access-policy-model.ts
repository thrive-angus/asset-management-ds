export const ACTIVE_ROLES=['Administrator','Asset Manager','Viewer','Staff'];
export function approvedRole(role:any,owner:boolean,inactive:boolean){if(owner)return 'Administrator';if(inactive||role==='Suspended')return 'Suspended';return ACTIVE_ROLES.includes(role)?role:'Pending'}
export function activeStaff(person:any){return !!person&&!person.archived&&person.employmentStatus!=='Inactive'&&person.stage!=='Offboarded'}
export function personalAsset(a:any){return {id:a.id,model:a.model,category:a.category,serial:a.serial,condition:a.condition,currentAssignmentDate:a.currentAssignmentDate,updated:a.updated,receipt:a.receipt?{name:a.receipt.name,date:a.receipt.date,condition:a.receipt.condition,termsVersion:a.receipt.termsVersion,terms:a.receipt.terms}:null}}
export function personalEquipment(records:any[],email:string){return records.filter(a=>!a.archived&&a.status==='Assigned'&&String(a.assignee||'').trim().toLowerCase()===email.trim().toLowerCase()).map(personalAsset)}
