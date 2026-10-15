import { equipmentTypeOptions } from '../../asset-identifiers';
import { getDb } from '../../../db';
import { settings, staff, history, authUsers } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { requireAccess, identity, ROLES, apiError, AccessError, OWNER_EMAIL } from '../../permissions';
import { hashPassword, passwordStrengthError } from '../../password-auth';

const ROLE_OPTIONS = [...ROLES, 'Suspended'];
type AccessActor = { userId: string; displayName: string; email: string };
type AccessPayload = Record<string, unknown>;

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function validEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value);
}

async function requireActiveStaffLink(personalStaffId: unknown) {
  const id = String(personalStaffId || '');
  if (!id) return null;
  const personRow = (await getDb().select().from(staff).where(eq(staff.id, id)))[0];
  const person = personRow && JSON.parse(personRow.data);
  if (!person || person.archived || person.employmentStatus === 'Inactive' || person.stage === 'Offboarded') {
    throw new AccessError('Choose an active staff record for this login.', 400);
  }
  return person;
}

export async function GET() {
  try {
    const user = await identity();
    if (!user) throw new AccessError('Sign in to access records.', 401);
    if (['Pending', 'Suspended'].includes(user.role)) return Response.json({ user });

    const db = getDb();
    const rows = await db.select().from(settings);
    const access = JSON.parse(rows.find(r => r.id === 'access')?.data || '{}');
    const authLogins = user.isAdmin
      ? (await db.select().from(authUsers)).map(row => ({
          id: row.id,
          email: row.email,
          displayName: row.displayName,
          mustResetPassword: row.mustResetPassword,
          createdAt: row.createdAt,
        }))
      : undefined;
    return Response.json({
      user,
      ownerEmail: user.isAdmin ? OWNER_EMAIL : undefined,
      personalLinks: user.isAdmin
        ? Object.fromEntries([
            ...rows
              .filter(r => r.id.startsWith('personal-account:'))
              .map(r => {
                const link = JSON.parse(r.data);
                return [String(link.loginEmail || '').toLowerCase(), link.staffId];
              })
              .filter(([email]) => !!email),
            ...rows
              .filter(r => r.id.startsWith('login-staff:'))
              .map(r => [r.id.slice('login-staff:'.length), JSON.parse(r.data).staffId]),
          ])
        : undefined,
      access: user.isAdmin ? access : undefined,
      authLogins,
      equipmentTypes: equipmentTypeOptions(JSON.parse(rows.find(r => r.id === 'equipment-types')?.data || '[]')),
      bundles: JSON.parse(rows.find(r => r.id === 'bundles')?.data || '[]'),
    });
  } catch (e) {
    return apiError(e);
  }
}

async function updateRoleOnly(user: AccessActor, input: AccessPayload) {
  const role = String(input.role || '');
  if (!validEmail(normalizeEmail(input.email)) || !ROLE_OPTIONS.includes(role as (typeof ROLE_OPTIONS)[number])) {
    return Response.json({ error: 'Enter an email and valid role.' }, { status: 400 });
  }

  const db = getDb();
  const email = normalizeEmail(input.email);
  if (email === OWNER_EMAIL && role !== 'Administrator') {
    throw new AccessError('The site owner keeps Administrator access.', 400);
  }

  const row = (await db.select().from(settings).where(eq(settings.id, 'access')))[0];
  const data = JSON.parse(row?.data || '{}');
  const currentRole = email === OWNER_EMAIL ? 'Administrator' : data[email] || null;
  if (input.expectedRole !== undefined && input.expectedRole !== currentRole) {
    throw new AccessError('Access changed since this window was opened. Refresh and review the current role.', 409);
  }

  data[email] = role;
  const date = new Date().toISOString();
  const event = {
    id: crypto.randomUUID(),
    assetId: 'Access Roles',
    date,
    action: 'Access role updated',
    recordedBy: { id: user.userId, name: user.displayName, email: user.email },
    details: { email, role },
  };

  if (input.personalStaffId) {
    const person = await requireActiveStaffLink(input.personalStaffId);
    await db.insert(settings).values({
      id: 'login-staff:' + email,
      data: JSON.stringify({ staffId: person!.id, loginEmail: email, approvedBy: user.userId, date }),
    }).onConflictDoUpdate({
      target: settings.id,
      set: { data: JSON.stringify({ staffId: person!.id, loginEmail: email, approvedBy: user.userId, date }) },
    });
  }

  const requestRows = (await db.select().from(settings)).filter(r => r.id.startsWith('role-request:'));
  await db.transaction(async tx => {
    for (const request of requestRows) {
      const parsed = JSON.parse(request.data);
      if (parsed.status === 'Pending' && parsed.email === email) {
        await tx.update(settings).set({
          data: JSON.stringify({
            ...parsed,
            status: 'Superseded',
            updated: date,
            decidedBy: { name: user.displayName, email: user.email },
            decisionNote: 'Administrator assigned access directly.',
          }),
        }).where(eq(settings.id, request.id));
      }
    }
    await tx.insert(settings).values({ id: 'access', data: JSON.stringify(data) }).onConflictDoUpdate({
      target: settings.id,
      set: { data: JSON.stringify(data) },
    });
    await tx.insert(history).values({ id: event.id, assetId: event.assetId, date, data: JSON.stringify(event) });
  });

  return Response.json({ ok: true });
}

async function upsertAccount(user: AccessActor, input: AccessPayload) {
  const db = getDb();
  const currentEmail = normalizeEmail(input.currentEmail || input.email);
  const nextEmail = normalizeEmail(input.email);
  const role = String(input.role || '');
  const displayName = String(input.displayName || '').trim();
  const password = String(input.password || '');
  const date = new Date().toISOString();

  if (!validEmail(currentEmail) || !validEmail(nextEmail)) {
    return Response.json({ error: 'Enter a valid sign-in email.' }, { status: 400 });
  }
  if (!ROLE_OPTIONS.includes(role as (typeof ROLE_OPTIONS)[number])) {
    return Response.json({ error: 'Choose a valid app role.' }, { status: 400 });
  }
  if (!displayName || displayName.length > 120) {
    return Response.json({ error: 'Enter a display name up to 120 characters.' }, { status: 400 });
  }
  const passValidation = password ? passwordStrengthError(password) : null;
  if (passValidation) return Response.json({ error: passValidation }, { status: 400 });
  if (currentEmail === OWNER_EMAIL && nextEmail !== OWNER_EMAIL) {
    throw new AccessError('The owner login email cannot be changed here.', 400);
  }
  if (nextEmail === OWNER_EMAIL && role !== 'Administrator') {
    throw new AccessError('The site owner keeps Administrator access.', 400);
  }

  const person = input.personalStaffId ? await requireActiveStaffLink(input.personalStaffId) : null;

  await db.transaction(async tx => {
    const accessRow = (await tx.select().from(settings).where(eq(settings.id, 'access')))[0];
    const access = JSON.parse(accessRow?.data || '{}');
    const currentRole = currentEmail === OWNER_EMAIL ? 'Administrator' : access[currentEmail] || null;
    if (input.expectedRole !== undefined && input.expectedRole !== currentRole) {
      throw new AccessError('Access changed since this window was opened. Refresh and review the current role.', 409);
    }

    const currentAccount = (await tx.select().from(authUsers).where(eq(authUsers.email, currentEmail)))[0];
    const targetAccount = currentEmail === nextEmail ? currentAccount : (await tx.select().from(authUsers).where(eq(authUsers.email, nextEmail)))[0];
    const hasAccount = !!currentAccount || !!targetAccount;
    if (!hasAccount && !password) {
      throw new AccessError('A password is required when creating a login.', 400);
    }
    if (currentAccount && currentEmail !== nextEmail && targetAccount) {
      throw new AccessError('Another login already uses that email.', 409);
    }

    if (currentAccount) {
      const updates: { email: string; displayName: string; passwordHash?: string; mustResetPassword?: boolean } = { email: nextEmail, displayName };
      if (password) {
        updates.passwordHash = hashPassword(password);
        updates.mustResetPassword = true;
      }
      await tx.update(authUsers).set(updates).where(eq(authUsers.id, currentAccount.id));
    } else if (targetAccount) {
      const updates: { displayName: string; passwordHash?: string; mustResetPassword?: boolean } = { displayName };
      if (password) {
        updates.passwordHash = hashPassword(password);
        updates.mustResetPassword = true;
      }
      await tx.update(authUsers).set(updates).where(eq(authUsers.id, targetAccount.id));
    } else {
      await tx.insert(authUsers).values({
        id: crypto.randomUUID(),
        email: nextEmail,
        displayName,
        passwordHash: hashPassword(password),
        mustResetPassword: true,
        createdAt: date,
      });
    }

    if (currentEmail !== nextEmail && currentEmail !== OWNER_EMAIL) delete access[currentEmail];
    access[nextEmail] = nextEmail === OWNER_EMAIL ? 'Administrator' : role;

    const existingLinkRow = (await tx.select().from(settings).where(eq(settings.id, 'login-staff:' + currentEmail)))[0];
    if (currentEmail !== nextEmail && existingLinkRow) {
      const link = JSON.parse(existingLinkRow.data || '{}');
      await tx.insert(settings).values({
        id: 'login-staff:' + nextEmail,
        data: JSON.stringify({ ...link, loginEmail: nextEmail, approvedBy: user.userId, date }),
      }).onConflictDoUpdate({
        target: settings.id,
        set: { data: JSON.stringify({ ...link, loginEmail: nextEmail, approvedBy: user.userId, date }) },
      });
      await tx.delete(settings).where(eq(settings.id, existingLinkRow.id));
    }

    if (person) {
      await tx.insert(settings).values({
        id: 'login-staff:' + nextEmail,
        data: JSON.stringify({ staffId: person.id, loginEmail: nextEmail, approvedBy: user.userId, date }),
      }).onConflictDoUpdate({
        target: settings.id,
        set: { data: JSON.stringify({ staffId: person.id, loginEmail: nextEmail, approvedBy: user.userId, date }) },
      });
    }

    const requestRows = (await tx.select().from(settings)).filter(r => r.id.startsWith('role-request:'));
    for (const request of requestRows) {
      const parsed = JSON.parse(request.data);
      if (parsed.status === 'Pending' && [currentEmail, nextEmail].includes(parsed.email)) {
        await tx.update(settings).set({
          data: JSON.stringify({
            ...parsed,
            status: 'Superseded',
            updated: date,
            decidedBy: { name: user.displayName, email: user.email },
            decisionNote: 'Administrator assigned access directly.',
          }),
        }).where(eq(settings.id, request.id));
      }
    }

    await tx.insert(settings).values({ id: 'access', data: JSON.stringify(access) }).onConflictDoUpdate({
      target: settings.id,
      set: { data: JSON.stringify(access) },
    });

    const action = currentAccount || targetAccount ? 'Login updated' : 'Login created';
    const eventId = crypto.randomUUID();
    await tx.insert(history).values({
      id: eventId,
      assetId: 'User Access',
      date,
      data: JSON.stringify({
        id: eventId,
        assetId: 'User Access',
        date,
        action,
        recordedBy: { id: user.userId, name: user.displayName, email: user.email },
        details: { email: nextEmail, role, passwordUpdated: !!password, forceResetOnNextSignIn: !currentAccount && !targetAccount || !!password, linkedStaffId: person?.id || null },
      }),
    });
  });

  return Response.json({ ok: true });
}

export async function POST(req: Request) {
  try {
    const user = await requireAccess('admin');
    const input = (await req.json()) as AccessPayload;
    // Await mutations here so asynchronous validation/transaction failures reach the catch.
    if (input.kind === 'user-account') return await upsertAccount(user, input);
    if (input.kind === 'access') return await updateRoleOnly(user, input);
    return Response.json({ error: 'Unsupported access action.' }, { status: 400 });
  } catch (e) {
    return apiError(e);
  }
}
