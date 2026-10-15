'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { readApiResponse } from '../api-response';

function safeReturn(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const returnTo = useMemo(() => safeReturn(params.get('return_to')), [params]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await readApiResponse(await fetch(`/api/auth/first-login-password?return_to=${encodeURIComponent(returnTo)}`, { cache: 'no-store' }));
        if (!active) return;
        if (!result.required) {
          window.location.assign(result.returnTo || returnTo || '/');
          return;
        }
        setChecking(false);
      } catch (e: unknown) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Unable to verify reset status.');
        setChecking(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [returnTo]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await readApiResponse(await fetch('/api/auth/first-login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, confirmPassword, returnTo }),
      }));
      window.location.assign(result.next || '/');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unable to update password.');
      setBusy(false);
    }
  }

  if (checking) {
    return <main className="signinscreen"><div className="signinlayout"><section className="signinpanel"><h2>Checking account status…</h2></section></div></main>;
  }

  return (
    <main className="signinscreen">
      <div className="signinlayout">
        <section className="signinwelcome">
          <small className="signineyebrow">Dental Stars</small>
          <h1>Set Your Password</h1>
          <p>Your account was created by an Administrator. Create your own password to continue.</p>
          <ul>
            <li>Use at least 12 characters</li>
            <li>Include uppercase, lowercase, numbers, and symbols</li>
            <li>This password will replace the temporary one</li>
          </ul>
        </section>
        <form className="signinpanel" onSubmit={submit}>
          <h2>First Login Password Reset</h2>
          <p>Choose a secure password before accessing dashboards.</p>
          <label htmlFor="first-login-password">
            New Password
            <input
              id="first-login-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={busy}
              required
            />
          </label>
          <label htmlFor="first-login-confirm">
            Confirm New Password
            <input
              id="first-login-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={busy}
              required
            />
          </label>
          {error && <p className="error signinerror" role="alert">{error}</p>}
          <button type="submit" className="primary signinbutton" disabled={busy}>
            {busy ? 'Saving…' : 'Save Password'}
          </button>
        </form>
      </div>
    </main>
  );
}
