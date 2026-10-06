'use client';

import { FormEvent, useState } from "react";

type LoginFormProps = {
  returnTo: string;
};

export default function LoginForm({ returnTo }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          returnTo,
        }),
      });
      const payload: any = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to sign in.");

      window.location.assign(typeof payload.redirectTo === "string" ? payload.redirectTo : returnTo);
    } catch (submitError: any) {
      setError(submitError.message || "Unable to sign in.");
      setSaving(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">Dental Stars Asset Manager</div>
        <h1 id="login-title">Sign in</h1>
        <p>Use the dummy login to open the equipment register.</p>

        <form onSubmit={onSubmit}>
          <label>
            Work email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error ? <div className="error" role="alert">{error}</div> : null}

          <button className="primary" type="submit" disabled={saving}>
            {saving ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}