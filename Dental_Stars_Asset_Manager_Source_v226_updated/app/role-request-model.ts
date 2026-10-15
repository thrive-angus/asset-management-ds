export const PORTAL_ROLES=['Administrator','Asset Manager','Viewer','Staff'];
export function makeRoleRequest(person:any,role:string,actor:any,previousRole:string|null,existing:any,date:string,id:string){
 if(!person||person.archived||person.employmentStatus==='Inactive'||person.stage==='Offboarded')throw Error('Select an active registered staff member.');
 if(!PORTAL_ROLES.includes(role))throw Error('Select a valid portal role.');
 if(existing?.status==='Pending')throw Error('A role request is already awaiting Administrator approval.');
 if(previousRole===role)throw Error('This role is already assigned.');
 return {id,staffId:person.id,name:person.name,email:person.email.toLowerCase(),role,previousRole,status:'Pending',date,updated:date,requestedBy:{id:actor.userId,name:actor.displayName,email:actor.email}};
}
export function decideRoleRequest(request:any,action:string,actor:any,version:string,currentRole:string|null,date:string,note:string){
 if(!actor.isAdmin||actor.isPreview)throw Error('Only an Administrator can approve or reject role requests.');
 if(!request||request.status!=='Pending'||request.updated!==version)throw Error('This request changed. Refresh before reviewing it.');
 if(!['approve','reject'].includes(action))throw Error('Choose Approve or Reject.');
 if(action==='approve'&&currentRole!==request.previousRole)throw Error('The current role changed. Review access settings before approving.');
 if(action==='reject'&&!note.trim())throw Error('Enter a reason for rejecting the role request.');
 return {...request,status:action==='approve'?'Approved':'Rejected',updated:date,decisionNote:note.trim().slice(0,1000),decidedBy:{id:actor.userId,name:actor.displayName,email:actor.email}};
}
