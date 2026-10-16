'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Eye, EyeOff } from 'lucide-react';
import HelpTip from './help-tip';
import PaginatedTable from './paginated-table';
import { readApiResponse } from './api-response';
import { userAccessRows, userAccountExpectedRole } from './user-access-model';
import styles from './user-access.module.css';

type AccessData = {
  user: { email: string };
  ownerEmail?: string;
  access?: Record<string, string>;
  personalLinks?: Record<string, string>;
  authLogins?: Array<{ id: string; email: string; displayName: string; mustResetPassword?: boolean; createdAt: string }>;
};

type StaffMember = { id: string; name: string; email?: string; archived?: boolean; employmentStatus?: string; stage?: string };
type AccessRow = {
  email: string;
  person?: StaffMember;
  role?: string | null;
  owner?: boolean;
  hasLogin?: boolean;
  login?: { displayName?: string; mustResetPassword?: boolean };
  status: string;
  pending?: { role?: string };
  linkMethod: string;
};
type EditUser = {
  currentEmail: string;
  email: string;
  displayName: string;
  role: string;
  personalStaffId: string;
  hasLogin: boolean;
  expectedRole: string | null;
  owner: boolean;
  password: string;
  confirmPassword: string;
  originalStaffId: string;
  existing: boolean;
  initial: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to complete this action.';
}

export default function UserAccess({ access, staff, refresh, onCreateStaff, onOpenStaff }: { access: AccessData; staff: StaffMember[]; refresh: () => Promise<void>; onCreateStaff?: (email: string) => void; onOpenStaff?: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [requests, setRequests] = useState<Array<{ status?: string; staffId?: string; email?: string; role?: string }>>([]);
  const [edit, setEdit] = useState<EditUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const result = await readApiResponse(await fetch('/api/role-requests'));
        if (alive) setRequests(result.items);
      } catch (e: unknown) {
        if (alive) setError(errorMessage(e));
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [access]);

  const rows = userAccessRows(
    staff,
    access.access || {},
    access.personalLinks || {},
    access.ownerEmail || access.user.email,
    requests,
    access.authLogins || [],
  );
  const shown = rows.filter(
    (r: AccessRow) =>
      (status === 'All' || (status === 'Reset Pending' ? !!r.login?.mustResetPassword : r.status === status)) &&
      [r.person?.name, r.email, r.role, r.login?.displayName]
        .some(v => String(v || '').toLowerCase().includes(query.trim().toLowerCase())),
  );

  function open(row: AccessRow | null = null) {
    setError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    const initial = {
      currentEmail: row?.email || '',
      email: row?.email || '',
      displayName: row?.login?.displayName || row?.person?.name || row?.email || '',
      role: row?.role || 'Staff',
      personalStaffId: row?.person?.id || '',
      hasLogin: !!row?.hasLogin,
      expectedRole: row?.role || null,
      owner: !!row?.owner,
    };
    setEdit({
      ...initial,
      password: '',
      confirmPassword: '',
      originalStaffId: row?.person?.id || '',
      existing: !!row,
      initial: JSON.stringify(initial),
    });
  }

  function close() {
    if (busy) return;
    const current = {
      currentEmail: edit?.currentEmail || '',
      email: edit?.email || '',
      displayName: edit?.displayName || '',
      role: edit?.role || '',
      personalStaffId: edit?.personalStaffId || '',
      hasLogin: !!edit?.hasLogin,
      expectedRole: edit?.expectedRole ?? null,
      owner: !!edit?.owner,
    };
    if (edit && JSON.stringify(current) !== edit.initial && !window.confirm('Discard unsaved user changes?')) return;
    setEdit(null);
    setError('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const email = normalizeEmail(edit.email);
      if (!email) throw Error('Enter a sign-in email.');
      if (edit.password && edit.password !== edit.confirmPassword) {
        throw Error('Password and confirmation do not match.');
      }
      const personalStaffId =
        edit.personalStaffId && edit.personalStaffId !== edit.originalStaffId
          ? edit.personalStaffId
          : undefined;
      await readApiResponse(await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'user-account',
          currentEmail: normalizeEmail(edit.currentEmail || edit.email),
          email,
          displayName: edit.displayName,
          role: edit.role,
          password: edit.password || undefined,
          personalStaffId,
          expectedRole: edit.existing
            ? edit.expectedRole
            : userAccountExpectedRole(email, access.access || {}, access.ownerEmail || ''),
        }),
      }));
      await refresh();
      window.dispatchEvent(new Event('action-counts-changed'));
      setMessage('User saved for ' + email + ' · ' + edit.role);
      setEdit(null);
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel report useraccesspanel">
      <div className="historyhead">
        <h2>
          Login access{' '}
          <HelpTip
            label="About user access"
            text="Manage app login accounts, passwords, and app roles in one place. App roles control dashboard permissions after sign in."
          />
        </h2>
        <button type="button" className="secondary" onClick={() => open()}>
          <Plus size={15} />
          Add login
        </button>
      </div>
      <div className="reportfilterbox useraccessfilters">
        <label>
          Search
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, email, or role" />
        </label>
        <label>
          Access Status
          <select value={status} onChange={e => setStatus(e.target.value)}>
            {['All', 'Reset Pending', 'No Role Assigned', 'Awaiting Approval', 'Approved', 'Approved · Owner', 'Suspended'].map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Access Statuses' : s}</option>
            ))}
          </select>
        </label>
      </div>
      {message && <p className="success" role="status">{message}</p>}
      {error && !edit && <p className="error" role="alert">{error}</p>}
      <div className="tablewrap">
        <PaginatedTable paginationKey={'user-access-' + query + status}>
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Username</th>
              <th>App Role</th>
              <th>Login</th>
              <th>Access Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r: AccessRow) => (
              <tr key={r.email}>
                <td>{r.person && onOpenStaff ? <button type="button" className="assetlink" onClick={() => onOpenStaff(r.person!.id)}>{r.person.name}</button> : r.person?.name || 'No staff record'}<small>{r.linkMethod}</small>{!r.person && r.hasLogin && onCreateStaff && <button type="button" className="assetlink" onClick={() => onCreateStaff(r.email)}>Add staff record</button>}</td>
                <td>{r.email}</td>
                <td>{r.role || '—'}</td>
                <td>{r.hasLogin ? (r.login?.mustResetPassword ? 'Configured · Reset Pending' : 'Configured') : 'Not Created'}{r.login?.displayName && <small>{r.login.displayName}</small>}{r.login?.mustResetPassword&&<small><span className="portalaccessstatus pending">Must reset password on first sign-in</span></small>}</td>
                <td>
                  <span className={'portalaccessstatus ' + (r.status.startsWith('Approved') ? 'enabled' : r.status === 'Suspended' ? 'suspended' : 'pending')}>
                    {r.status}
                  </span>
                  {r.pending && <small>Requested: {r.pending.role}</small>}
                </td>
                <td>
                  <button type="button" className="secondary" onClick={() => open(r)}>
                    {r.hasLogin ? 'Edit User' : 'Create Login'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </PaginatedTable>
      </div>
      {!shown.length && <p className="hint">No matching user records.</p>}
      <p className="useraccessnotice">Roles define post-login access. Staff can only access role-allowed dashboards and actions.</p>
      {edit && (
        <div className="overlay">
          <section className="modal useraccessmodal" role="dialog" aria-modal="true" aria-labelledby="user-access-title">
            <div className="modalhead">
              <div>
                <span className="eyebrow">USER ACCOUNT</span>
                <h2 id="user-access-title">{edit.hasLogin ? 'Edit User' : 'Create User'}</h2>
              </div>
              <button className="iconbtn" type="button" aria-label="Close user access window" onClick={close}><X size={20} /></button>
            </div>
            <form id="user-access-form" onSubmit={save}>
              <fieldset disabled={busy}>
                <div className="formgrid">
                  <label>
                    Username (Sign-in Email)
                    <input
                      type="email"
                      required
                      value={edit.email}
                      onChange={e => setEdit({ ...edit, email: e.target.value })}
                    />
                  </label>
                  <label>
                    Display Name
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={edit.displayName}
                      onChange={e => setEdit({ ...edit, displayName: e.target.value })}
                    />
                  </label>
                  <label>
                    App Role
                    <select disabled={edit.owner} value={edit.role} onChange={e => setEdit({ ...edit, role: e.target.value })}>
                      {['Administrator', 'Asset Manager', 'Viewer', 'Staff', 'Suspended'].map(role => <option key={role}>{role}</option>)}
                    </select>
                    {edit.owner && <small>Owner Administrator access is protected.</small>}
                  </label>
                  <label className="useraccessstafflink">
                    Personal Staff Record (Optional)
                    <select value={edit.personalStaffId} onChange={e => setEdit({ ...edit, personalStaffId: e.target.value })}>
                      <option value="">Keep existing link / use matching email</option>
                      {staff
                        .filter(s => (!s.archived && s.employmentStatus !== 'Inactive' && s.stage !== 'Offboarded') || s.id === edit.personalStaffId)
                        .map(s => <option key={s.id} value={s.id}>{s.name} · {s.email}</option>)}
                    </select>
                  </label>
                  <div className={styles.field}>
                    <label htmlFor="user-access-password">{edit.hasLogin ? 'New Password (Optional)' : 'Password'}</label>
                    <div className={styles.control}>
                    <input
                      id="user-access-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={edit.password}
                      onChange={e => setEdit({ ...edit, password: e.target.value })}
                      required={!edit.hasLogin}
                    />
                    <button type="button" className={styles.toggle} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-controls="user-access-password" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>
                      {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                    </button>
                    </div>
                    <small className={styles.hint}>{edit.hasLogin ? 'Leave blank to keep the current password. If changed, the user must reset it on next sign-in.' : 'Use 12+ chars and mix uppercase/lowercase/numbers/symbols. The user will reset this on first sign-in.'}</small>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="user-access-confirm-password">Confirm Password</label>
                    <div className={styles.control}>
                    <input
                      id="user-access-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={edit.confirmPassword}
                      onChange={e => setEdit({ ...edit, confirmPassword: e.target.value })}
                      required={!!edit.password}
                    />
                    <button type="button" className={styles.toggle} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} aria-controls="user-access-confirm-password" aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword(value => !value)}>
                      {showConfirmPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                    </button>
                    </div>
                  </div>
                </div>
                {edit.role === 'Suspended' && (
                  <p className="hint">Suspended access blocks app records and actions. It does not delete staff or equipment history.</p>
                )}
                {error && <p className="error" role="alert">{error}</p>}
              </fieldset>
            </form>
            <div className="modalactions">
              <button type="button" className="secondary" disabled={busy} onClick={close}>Cancel</button>
              <button type="submit" form="user-access-form" className="primary" disabled={busy || !edit.email.trim() || !edit.displayName.trim()}>
                {busy ? 'Saving…' : 'Save User'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
