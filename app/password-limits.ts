import {createHash} from 'node:crypto';
import {getPgPool} from '../db';

export async function reservePasswordAttempt(scope:string,key:string,limit:number):Promise<boolean>{
 const id=createHash('sha256').update('password:'+scope+':'+key).digest('hex');
 const result=await getPgPool().query(`
  INSERT INTO auth_login_attempts (id, attempts, window_started_at) VALUES ($1, 1, NOW())
  ON CONFLICT (id) DO UPDATE SET
   attempts = CASE WHEN auth_login_attempts.window_started_at <= NOW() - INTERVAL '15 minutes' THEN 1 ELSE auth_login_attempts.attempts + 1 END,
   window_started_at = CASE WHEN auth_login_attempts.window_started_at <= NOW() - INTERVAL '15 minutes' THEN NOW() ELSE auth_login_attempts.window_started_at END
  WHERE auth_login_attempts.attempts < $2 OR auth_login_attempts.window_started_at <= NOW() - INTERVAL '15 minutes'
  RETURNING id
 `,[id,limit]);
 return result.rowCount===1;
}
