export function isOwnStaffRecord(person:any,user:any){
 const normalize=(value:any)=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
 return !person.archived&&!!person.email&&(normalize(person.email)===normalize(user.email)||!!user.personalStaffId&&person.id===user.personalStaffId);
}
