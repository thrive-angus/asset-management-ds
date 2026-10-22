import {requireChatGPTUser} from '../../chatgpt-auth';
import PasswordSecurityForm from './password-security-form';
export const dynamic='force-dynamic';
export default async function AccountSecurityPage(){const user=await requireChatGPTUser('/account/security');return <PasswordSecurityForm email={user.email}/>}
