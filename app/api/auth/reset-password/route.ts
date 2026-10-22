import {readAuthRequest} from '../../../auth-request';
import {redeemPasswordReset,validResetToken,newPasswordError,PasswordActionError,RESET_LINK_ERROR} from '../../../password-recovery';
import {reservePasswordAttempt} from '../../../password-limits';
import {passwordApiError,passwordRateLimited,passwordUpdatedResponse} from '../../../password-api';

export async function POST(req:Request){
 try{
  const input=await readAuthRequest(req);
  if(!validResetToken(input.token))throw new PasswordActionError(RESET_LINK_ERROR);
  const error=newPasswordError(input.newPassword,input.confirmPassword);if(error)throw new PasswordActionError(error);
  if(!await reservePasswordAttempt('redeem-global','all',300)||!await reservePasswordAttempt('redeem-token',input.token,10))return passwordRateLimited();
  await redeemPasswordReset(input.token,input.newPassword as string);
  return passwordUpdatedResponse();
 }catch(error){return passwordApiError(error)}
}
