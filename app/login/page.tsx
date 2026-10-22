'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PasswordInput from '../password-input';

function safeReturn(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

export default function LoginPage() {
  const params = useSearchParams();
  const returnTo = useMemo(() => safeReturn(params.get('return_to')), [params]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnTo }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error || 'Unable to sign in.');
        setBusy(false);
        return;
      }
      window.location.assign(payload.next || '/');
    } catch {
      setError('Unable to sign in.');
      setBusy(false);
    }
  }

  return (
    <main className="signinscreen">
      <div className="signinlayout">
        <section className="signinwelcome">
          <small className="signineyebrow">Dental Stars</small>
          <h1>Asset Management Portal</h1>
          <p>Track equipment, staff handovers, inventory checks, and service history in one secure workspace.</p>
          <ul>
            <li>Centralized asset records and assignment timeline</li>
            <li>Role-based access controls and approval workflows</li>
            <li>Staff portal with acknowledgements and accountability</li>
          </ul>
        </section>
        <form className="signinpanel" onSubmit={submit}>
          <h2>Sign In</h2>
          {params.get('password_updated')==='1'&&<p className="success" role="status">Password updated. Sign in with your new password.</p>}
          <p>Use your assigned app account to continue.</p>
          <label htmlFor="login-email">
            Work Email
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              required
            />
          </label>
          <PasswordInput id="login-password" label="Password" value={password} onChange={setPassword} disabled={busy}/>
          {error && <p className="error signinerror" role="alert">{error}</p>}
          <button type="submit" className="primary signinbutton" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
          <div className="securitypasswordlinks"><a href="/forgot-password">Forgot password?</a></div><small className="signinhelp">Need access? Contact your Administrator.</small>
        </form>
      </div>
    </main>
  );
}
