import { createHash } from 'node:crypto';
import { getPgPool } from '../db';

// PostgreSQL makes this budget atomic and shared by every app replica/restart.
const MAX_ATTEMPTS = 10;
export const LOGIN_RETRY_SECONDS = 15 * 60;
function accountKey(email: string) {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}
export async function reserveLoginAttempt(email: string): Promise<boolean> {
  const result = await getPgPool().query(`
    INSERT INTO auth_login_attempts (id, attempts, window_started_at)
    VALUES ($1, 1, NOW())
    ON CONFLICT (id) DO UPDATE SET
      attempts = CASE WHEN auth_login_attempts.window_started_at <= NOW() - INTERVAL '15 minutes'
        THEN 1 ELSE auth_login_attempts.attempts + 1 END,
      window_started_at = CASE WHEN auth_login_attempts.window_started_at <= NOW() - INTERVAL '15 minutes'
        THEN NOW() ELSE auth_login_attempts.window_started_at END
    WHERE auth_login_attempts.attempts < $2
       OR auth_login_attempts.window_started_at <= NOW() - INTERVAL '15 minutes'
    RETURNING id
  `, [accountKey(email), MAX_ATTEMPTS]);
  return result.rowCount === 1;
}
export async function clearLoginAttempts(email: string) {
  await getPgPool().query('DELETE FROM auth_login_attempts WHERE id = $1', [accountKey(email)]);
}
