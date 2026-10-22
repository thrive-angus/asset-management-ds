import {createHash,randomBytes} from 'node:crypto';
import {getPgPool} from '../db';
import {hashPassword,verifyPassword,passwordStrengthError} from './password-auth';
import {sendPasswordResetEmail} from './password-email.mjs';

export class PasswordActionError extends Error{constructor(message:string,public status=400){super(message)}}
export const RESET_LINK_ERROR='This reset link is invalid or expired. Request a new one.';
export function validResetToken(token:unknown):token is string{return typeof token==='string'&&/^[a-f0-9]{64}$/.test(token)}
export function resetTokenHash(token:string){return createHash('sha256').update(token).digest('hex')}
export function newPasswordError(password:unknown,confirmation:unknown){
 if(typeof password!=='string'||typeof confirmation!=='string'||!password||!confirmation)return 'Enter and confirm your new password.';
 if(password!==confirmation)return 'Password confirmation does not match.';
 return passwordStrengthError(password);
}
type UserRow={id:string;email:string;password_hash:string;must_reset_password:boolean};

// Runs after the HTTP response so SMTP latency cannot reveal account existence.
export async function deliverPasswordReset(email:string){
 const client=await getPgPool().connect();
 const token=randomBytes(32).toString('hex'),digest=resetTokenHash(token);
 let issued=false;
 try{
  await client.query('BEGIN');
  const user=(await client.query('SELECT id, email, password_hash FROM auth_users WHERE email = $1 FOR UPDATE',[email])).rows[0] as UserRow|undefined;
  if(user){
   await client.query('DELETE FROM auth_password_resets WHERE user_id = $1 OR expires_at <= NOW()',[user.id]);
   await client.query("INSERT INTO auth_password_resets (token_hash,user_id,email,password_hash_snapshot,expires_at) VALUES ($1,$2,$3,$4,NOW() + INTERVAL '30 minutes')",[digest,user.id,user.email,user.password_hash]);
   issued=true;
  }
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
 if(!issued)return;
 try{await sendPasswordResetEmail(email,token)}catch{
  // Do not leave a usable link for a failed delivery, or log the email or token.
  await getPgPool().query('DELETE FROM auth_password_resets WHERE token_hash = $1',[digest]);
  throw Error('Password reset email delivery failed.');
 }
}

export async function redeemPasswordReset(token:string,password:string){
 const client=await getPgPool().connect();
 try{
  await client.query('BEGIN');
  const digest=resetTokenHash(token);
  const reset=(await client.query('SELECT user_id FROM auth_password_resets WHERE token_hash = $1 AND expires_at > NOW()',[digest])).rows[0] as {user_id:string}|undefined;
  if(!reset)throw new PasswordActionError(RESET_LINK_ERROR);
  // Lock the account first, then re-check and consume the token under that lock.
  const user=(await client.query('SELECT id, email, password_hash FROM auth_users WHERE id = $1 FOR UPDATE',[reset.user_id])).rows[0] as UserRow|undefined;
  if(!user)throw new PasswordActionError(RESET_LINK_ERROR);
  const consumed=await client.query('DELETE FROM auth_password_resets WHERE token_hash = $1 AND user_id = $2 AND email = $3 AND password_hash_snapshot = $4 AND expires_at > NOW() RETURNING user_id',[digest,user.id,user.email,user.password_hash]);
  if(!consumed.rowCount)throw new PasswordActionError(RESET_LINK_ERROR);
  if(verifyPassword(password,user.password_hash))throw new PasswordActionError('Choose a password different from your current password.');
  await client.query('UPDATE auth_users SET password_hash = $1, must_reset_password = FALSE WHERE id = $2',[hashPassword(password),user.id]);
  await client.query('DELETE FROM auth_sessions WHERE user_id = $1',[user.id]);
  await client.query('DELETE FROM auth_login_attempts WHERE id = $1',[createHash('sha256').update(user.email.trim().toLowerCase()).digest('hex')]);
  await client.query('DELETE FROM auth_password_resets WHERE user_id = $1',[user.id]);
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}

export async function updateOwnPassword(account:{token:string;user:{id:string}},currentPassword:string,password:string){
 const client=await getPgPool().connect();
 try{
  await client.query('BEGIN');
  const user=(await client.query('SELECT id, email, password_hash FROM auth_users WHERE id = $1 FOR UPDATE',[account.user.id])).rows[0] as UserRow|undefined;
  const session=(await client.query('SELECT expires_at FROM auth_sessions WHERE id = $1 AND user_id = $2',[account.token,account.user.id])).rows[0] as {expires_at:string}|undefined;
  const expiry=session?Date.parse(session.expires_at):NaN;
  if(!user||!Number.isFinite(expiry)||expiry<=Date.now())throw new PasswordActionError('Sign in again to change your password.',401);
  if(!verifyPassword(currentPassword,user.password_hash))throw new PasswordActionError('Your current password is incorrect.');
  if(verifyPassword(password,user.password_hash))throw new PasswordActionError('Choose a password different from your current password.');
  await client.query('UPDATE auth_users SET password_hash = $1, must_reset_password = FALSE WHERE id = $2',[hashPassword(password),user.id]);
  await client.query('DELETE FROM auth_sessions WHERE user_id = $1',[user.id]);
  await client.query('DELETE FROM auth_login_attempts WHERE id = $1',[createHash('sha256').update(user.email.trim().toLowerCase()).digest('hex')]);
  await client.query('DELETE FROM auth_password_resets WHERE user_id = $1',[user.id]);
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}
