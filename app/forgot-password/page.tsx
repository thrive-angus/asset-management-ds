'use client';
import {useState,type FormEvent} from 'react';
import {readApiResponse} from '../api-response';
import '../password-security.css';

export default function ForgotPasswordPage(){
 const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError('');setMessage('');try{const result=await readApiResponse(await fetch('/api/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})}));setMessage(result.message)}catch(error){setError(error instanceof Error?error.message:'Unable to request a reset link.')}finally{setBusy(false)}}
 return <main className="signinscreen"><div className="signinlayout"><section className="signinwelcome"><small className="signineyebrow">Dental Stars</small><h1>Forgot your password?</h1><p>Request a secure link to choose a new password for your account.</p><ul><li>Use your sign-in email address</li><li>The link expires after 30 minutes</li><li>Your password stays unchanged until you choose a new one</li></ul></section><form className="signinpanel" onSubmit={submit}><h2>Reset your password</h2><p>We’ll send a reset link if there’s an account for this email.</p><label htmlFor="recovery-email">Sign-in email<input id="recovery-email" type="email" autoComplete="email" maxLength={254} required value={email} disabled={busy} onChange={event=>setEmail(event.target.value)}/></label>{error&&<p className="error securitypasswordnotice" role="alert">{error}</p>}{message&&<p className="success securitypasswordnotice" role="status">{message}</p>}<button type="submit" className="primary signinbutton" disabled={busy}>{busy?'Requesting link…':'Send reset link'}</button><div className="securitypasswordlinks"><a href="/login">Back to sign in</a></div></form></div></main>;
}
