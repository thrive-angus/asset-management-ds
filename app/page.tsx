import AssetApp from './asset-app';
import {requireAppUser} from './auth';
export default async function Home(){await requireAppUser('/');return <AssetApp/>}
