import {sessionAccount} from '../../../local-auth';
import {readAuthRequest} from '../../../auth-request';
import {updateOwnPassword,newPasswordError,PasswordActionError} from '../../../password-recovery';
import {reservePasswordAttempt} from '../../../password-limits';
import {passwordApiError,passwordRateLimited,passwordUpdatedResponse} from '../../../password-api';

export async function POST(req:Request){
 try{
  const account=await sessionAccount();if(!account)throw new PasswordActionError('Sign in again to change your password.',401);
  if((req.headers.get('cookie')||'').split(';').some(value=>value.trim().startsWith('ds_role_preview=')))throw new PasswordActionError('Leave portal preview before changing your password.',403);
  const input=await readAuthRequest(req),current=typeof input.currentPassword==='string'?input.currentPassword:'';
  if(!current||current.length>1024)throw new PasswordActionError('Enter your current password.');
  const error=newPasswordError(input.newPassword,input.confirmPassword);if(error)throw new PasswordActionError(error);
  if(!await reservePasswordAttempt('change-account',account.user.id,5))return passwordRateLimited();
  await updateOwnPassword(account,current,input.newPassword as string);
  return passwordUpdatedResponse();
 }catch(error){return passwordApiError(error)}
}
