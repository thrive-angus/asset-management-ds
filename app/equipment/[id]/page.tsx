import {requireChatGPTUser} from '../../chatgpt-auth';
import AssetApp from '../../asset-app';

export const dynamic='force-dynamic';
export default async function EquipmentPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 await requireChatGPTUser('/equipment/'+encodeURIComponent(id));
 return <AssetApp initialAssetId={id}/>;
}
