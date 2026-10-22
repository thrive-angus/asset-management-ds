'use client';
import {useEffect,useState,type FormEvent} from 'react';
import PasswordInput from '../password-input';
import {readApiResponse} from '../api-response';

export default function RecoverPasswordPage(){
 const [token,setToken]=useState(''),[checking,setChecking]=useState(true),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 useEffect(()=>{
  const url=new URL(window.location.href),value=new URLSearchParams(url.hash.slice(1)).get('token')||'';
  // Synchronize browser-only fragment data; the server must never receive it.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setToken(/^[a-f0-9]{64}$/.test(value)?value:'');setChecking(false);
  // Remove the bearer secret from the address bar before any API requests.
  window.history.replaceState(window.history.state,'',url.pathname+url.search);
 },[]);
 async function submit(event:FormEvent){event.preventDefault();setError('');if(password!==confirm){setError('Password confirmation does not match.');return}setBusy(true);try{await readApiResponse(await fetch('/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,newPassword:password,confirmPassword:confirm})}));setPassword('');setConfirm('');setToken('');setDone(true)}catch(error){setError(error instanceof Error?error.message:'Unable to reset your password.')}finally{setBusy(false)}}
 return <main className="signinscreen"><div className="signinlayout"><section className="signinwelcome"><small className="signineyebrow">Dental Stars</small><h1>Choose a new password</h1><p>Use a unique password you don’t use for other accounts.</p><ul><li>At least 12 characters</li><li>Include at least three: uppercase, lowercase, numbers and symbols</li><li>Existing sessions will be signed out</li></ul></section><section className="signinpanel"><h2>{done?'Password updated':'Reset your password'}</h2>{checking?<p role="status">Reading reset link…</p>:done?<><p className="success securitypasswordnotice" role="status">Your password has been changed. Sign in with your new password.</p><a className="primary signinbutton" href="/login">Sign in</a></>:!token?<><p className="error securitypasswordnotice" role="alert">Open the reset link from your email, or request a new link.</p><a href="/forgot-password">Request a reset link</a></>:<form onSubmit={submit}><PasswordInput id="recovered-password" label="New password" value={password} onChange={setPassword} disabled={busy} newPassword/><PasswordInput id="recovered-confirm" label="Confirm new password" value={confirm} onChange={setConfirm} disabled={busy} newPassword/>{error&&<p className="error securitypasswordnotice" role="alert">{error}</p>}<button type="submit" className="primary signinbutton" disabled={busy}>{busy?'Updating…':'Reset password'}</button></form>}{!done&&<div className="securitypasswordlinks"><a href="/login">Back to sign in</a>{token&&<a href="/forgot-password">Request a new link</a>}</div>}</section></div></main>;
}
