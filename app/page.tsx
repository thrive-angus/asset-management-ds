import { requireChatGPTUser } from './chatgpt-auth';
import AssetApp from './asset-app';

export const dynamic = 'force-dynamic';

export default async function Home(){
 await requireChatGPTUser('/');
 return <AssetApp/>;
}
