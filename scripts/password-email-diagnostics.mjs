import {passwordMailSettings} from '../app/password-email.mjs';

export function passwordEmailConfigurationIssues(env=process.env){
 const required=['APP_ORIGIN','SMTP_HOST','SMTP_USER','SMTP_PASSWORD','MAIL_FROM'];
 const missing=required.filter(name=>!env[name]);
 if(missing.length)return ['Missing environment variables: '+missing.join(', ')+'. Save them on the application and redeploy.'];
 if(/\s|:\/\//.test(env.SMTP_HOST))return ['SMTP_HOST must be a hostname without a protocol, spaces or a port.'];
 try{passwordMailSettings(env);return []}catch(error){
  if(error?.message==='Invalid SMTP configuration.')return ['SMTP_PORT must be a number from 1 to 65535. SMTP_SECURE must be exactly true or false. For Mailgun port 587, use false (STARTTLS is still required).'];
  if(error?.message==='Email delivery is not configured.')return ['Check MAIL_FROM for line breaks and confirm the SMTP settings are populated.'];
  return ['APP_ORIGIN must be your HTTPS site origin, without a path, query, fragment or embedded credentials.'];
 }
}

// Deliberately omit provider messages, SMTP responses, hosts and credential values.
export function passwordEmailConnectionIssue(error){
 const advice={
  EAUTH:'The SMTP provider rejected authentication. Use the domain SMTP username/password, not the account password or an API key. Confirm the Mailgun domain is active and the US/EU SMTP region matches.',
  EDNS:'SMTP hostname lookup failed. Check SMTP_HOST and the container DNS/network.',
  ENOTFOUND:'SMTP hostname lookup failed. Check SMTP_HOST and the container DNS/network.',
  EAI_AGAIN:'DNS lookup temporarily failed. Check container DNS/network and retry.',
  ETIMEDOUT:'SMTP connection timed out. Check outbound access to the configured SMTP port, the host/region, and port/TLS settings.',
  ECONNREFUSED:'The SMTP connection was refused. Check SMTP_HOST, SMTP_PORT and outbound firewall rules.',
  ECONNECTION:'The SMTP connection failed. Check the host/region, port and outbound network access.',
  ECONNRESET:'The SMTP connection was reset. Check network access and port/TLS settings.',
  ESOCKET:'The SMTP socket or TLS connection failed. Check the host/region and port/TLS settings; keep certificate verification enabled.',
  ETLS:'STARTTLS failed. Check the host and port; keep TLS and certificate verification enabled.',
  EPROTOCOL:'The SMTP server returned an unexpected protocol response. Check the host and port.',
  CERT_HAS_EXPIRED:'SMTP TLS certificate validation failed: the certificate is expired. Check the system clock and provider certificate.',
  ERR_TLS_CERT_ALTNAME_INVALID:'SMTP TLS certificate validation failed: hostname mismatch. Check SMTP_HOST.',
  DEPTH_ZERO_SELF_SIGNED_CERT:'SMTP TLS certificate validation failed: a self-signed certificate was presented. Check the provider/network; do not disable certificate validation.',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE:'SMTP TLS certificate validation failed: the certificate chain could not be verified. Check the provider/network.',
 };
 const code=typeof error?.code==='string'&&Object.hasOwn(advice,error.code)?error.code:'UNKNOWN';
 const response=Number.isInteger(error?.responseCode)&&error.responseCode>=400&&error.responseCode<=599?' SMTP status '+error.responseCode+'.':'';
 return '['+code+']'+response+' '+(advice[code]||'SMTP verification failed. Check provider logs and the connection settings. Raw error details were omitted to protect credentials.');
}
