import { identity, apiError, AccessError } from '../../permissions';
import { getDb } from '../../../db';
import { staff } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const user = await identity();
    if (user?.mustResetPassword) throw new AccessError('Password reset required before accessing records.', 403);
    if (user?.actualRole !== 'Administrator') throw new AccessError('Administrator access is required.', 403);
    const input = await req.json() as Record<string, unknown>;
    const role = String(input.role || ''), staffId = String(input.staffId || '');
    if (!['Administrator', 'Asset Manager', 'Viewer', 'Staff'].includes(role)) {
      throw new AccessError('Choose a valid view.', 400);
    }
    let ownPortal = false;
    if (role === 'Staff') {
      const row = (await getDb().select().from(staff).where(eq(staff.id, staffId)))[0];
      const person = row && JSON.parse(row.data);
      if (!person || person.archived || !person.email) throw new AccessError('Select a registered staff member with a work email.', 400);
      ownPortal = person.id === user.personalStaffId || person.email.toLowerCase() === user.email.toLowerCase();
    }
    const cookie = role === 'Administrator' || ownPortal
      ? 'ds_role_preview=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax'
      : 'ds_role_preview=' + encodeURIComponent(JSON.stringify({ role, staffId })) + '; Path=/; Max-Age=3600; HttpOnly; Secure; SameSite=Lax';
    return Response.json({ ok: true, next: ownPortal ? '/staff' : '/' }, {
      headers: { 'Set-Cookie': cookie, 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return apiError(error);
  }
}
