import { requireChatGPTUser } from '../chatgpt-auth';
import StaffPortal from '../staff-portal';

export const dynamic = 'force-dynamic';

export default async function StaffPage(){
 await requireChatGPTUser('/staff');
 return <StaffPortal/>;
}
