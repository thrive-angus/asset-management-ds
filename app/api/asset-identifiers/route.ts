import {getDb} from '../../../db';
import {assets,settings} from '../../../db/schema';
import {requireAccess,apiError,AccessError} from '../../permissions';
import {equipmentTypeOptions,unusedIdentifiers} from '../../asset-identifiers';
export async function GET(req:Request){try{const user=await requireAccess();if(user.role==='Staff')throw new AccessError('Asset registration tools are not available in the staff portal.',403);const records=(await getDb().select().from(assets)).map(r=>JSON.parse(r.data));const requested=new URL(req.url).searchParams.get('category')?.trim();const config=(await getDb().select().from(settings)).find(r=>r.id==='equipment-types');const types=equipmentTypeOptions([...JSON.parse(config?.data||'[]'),...(requested?[requested]:[])],records);return Response.json({types,available:Object.fromEntries(types.map(type=>[type,unusedIdentifiers(type,records)]))})}catch(e){return apiError(e)}}
