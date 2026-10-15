import {requireAccess,apiError,AccessError} from '../../permissions';
import {isOwnStaffRecord} from '../../personal-account-model';
import {getDb} from '../../../db';
import {assets,staff} from '../../../db/schema';
import {personalEquipment} from '../../access-policy-model';
export async function GET(){try{const user=await requireAccess();const records=(await getDb().select().from(assets)).map(r=>JSON.parse(r.data));return Response.json({user:{name:user.displayName,email:user.personalEmail,loginEmail:user.email,personalStaffId:user.personalStaffId,role:user.role,canManage:user.canManage,isPreview:user.isPreview,actualRole:user.actualRole},staffChoices:!user.isPreview?(await getDb().select().from(staff)).map(r=>JSON.parse(r.data)).filter(s=>isOwnStaffRecord(s,user)).map(s=>({id:s.id,name:s.name,email:s.email})):[],assets:personalEquipment(records,user.personalEmail)},{headers:{'Cache-Control':'private, no-store'}})}catch(e){return apiError(e)}}
