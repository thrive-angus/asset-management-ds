'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

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
      <form className="signinpanel" onSubmit={submit}>
        <h1>Dental Stars Asset Manager</h1>
        <p>Sign in with your assigned app account.</p>
        <label>
          Work Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </main>
  );
}
