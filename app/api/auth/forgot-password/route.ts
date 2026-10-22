import {after,NextResponse} from 'next/server';
import {readAuthRequest} from '../../../auth-request';
import {passwordMailSettings} from '../../../password-email.mjs';
import {deliverPasswordReset,PasswordActionError} from '../../../password-recovery';
import {reservePasswordAttempt} from '../../../password-limits';
import {passwordApiError,passwordRateLimited} from '../../../password-api';

export async function POST(req:Request){
 try{
  const input=await readAuthRequest(req),email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
  if(!email||email.length>254||!/^\S+@\S+\.\S+$/.test(email)||/[\r\n,;<>\x00-\x1f]/.test(email))throw new PasswordActionError('Enter a valid sign-in email address.');
  try{passwordMailSettings()}catch{throw new PasswordActionError('Email password reset is not configured yet. Contact your administrator.',503)}
  if(!await reservePasswordAttempt('request-global','all',100)||!await reservePasswordAttempt('request-email',email,3))return passwordRateLimited();
  after(async()=>{try{await deliverPasswordReset(email)}catch{console.error('Password reset email could not be delivered. Check SMTP and database configuration.')}});
  return NextResponse.json({ok:true,message:'If an account exists for this email address, a password reset link will be sent shortly. Check your inbox and spam folder.'},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return passwordApiError(error)}
}
