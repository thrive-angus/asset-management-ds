type StaffMember = { id: string; name?: string; email?: string; archived?: boolean; employmentStatus?: string; stage?: string };
type AccessRequest = { status?: string; staffId?: string; email?: string; role?: string };
type LoginUser = { email: string; displayName?: string };

export function userAccessRows(staff:StaffMember[],roles:Record<string,string>,links:Record<string,string>,ownerEmail:string,requests:AccessRequest[]=[],logins:LoginUser[]=[]){
 const normalize=(value:unknown)=>String(value||'').trim().toLowerCase(),owner=normalize(ownerEmail),emails=new Set([owner,...Object.keys(roles).map(normalize),...logins.map(login=>normalize(login.email))]),linked=new Set<string>(),loginByEmail=Object.fromEntries(logins.map(login=>[normalize(login.email),login]));
 const personFor=(email:string)=>staff.find(s=>s.id===links[email])||staff.find(s=>normalize(s.email)===email);
 const rows=[...emails].filter(Boolean).map(email=>{const person=personFor(email),login=loginByEmail[email]||null;if(person)linked.add(person.id);return {email,person,role:email===owner?'Administrator':roles[email]||null,owner:email===owner,login,hasLogin:!!login}});
 for(const person of staff)if(!person.archived&&!linked.has(person.id)&&!emails.has(normalize(person.email)))rows.push({email:normalize(person.email),person,role:null,owner:false,login:null,hasLogin:false});
 return rows.map(row=>{const pending=requests.find(r=>r.status==='Pending'&&(r.staffId===row.person?.id||normalize(r.email)===row.email));const inactive=row.person&&(row.person.archived||row.person.employmentStatus==='Inactive'||row.person.stage==='Offboarded');return {...row,linkMethod:links[row.email]?'Verified Link':row.person?'Email Match':'Not Linked',status:row.owner?'Approved · Owner':inactive||row.role==='Suspended'?'Suspended':pending?'Awaiting Approval':row.role?'Approved':'No Role Assigned',pending}}).sort((a,b)=>Number(b.owner)-Number(a.owner)||(a.person?.name||a.email).localeCompare(b.person?.name||b.email));
}
