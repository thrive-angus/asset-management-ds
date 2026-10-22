import nodemailer from 'nodemailer';

export function passwordMailSettings(env=process.env){
 const origin=new URL(env.APP_ORIGIN||'invalid:');
 const local=env.NODE_ENV!=='production'&&['localhost','127.0.0.1','[::1]'].includes(origin.hostname)&&origin.protocol==='http:';
 if((origin.protocol!=='https:'&&!local)||origin.username||origin.password||origin.search||origin.hash||origin.pathname!=='/')throw Error('Invalid email origin configuration.');
 const port=Number(env.SMTP_PORT||587),secure=env.SMTP_SECURE===undefined?port===465:env.SMTP_SECURE==='true';
 if(!Number.isInteger(port)||port<1||port>65535||env.SMTP_SECURE!==undefined&&!['true','false'].includes(env.SMTP_SECURE))throw Error('Invalid SMTP configuration.');
 if(!env.SMTP_HOST||!env.SMTP_USER||!env.SMTP_PASSWORD||!env.MAIL_FROM||/[\r\n]/.test(env.MAIL_FROM))throw Error('Email delivery is not configured.');
 return {origin:origin.origin,from:env.MAIL_FROM,transport:{host:env.SMTP_HOST,port,secure,requireTLS:!secure,auth:{user:env.SMTP_USER,pass:env.SMTP_PASSWORD},tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true}};
}
export function passwordResetMessage(email,token,settings){
 const url=new URL('/recover-password',settings.origin);
 // A fragment stays out of HTTP request URLs, access logs and referrers.
 url.hash='token='+token;
 return {from:settings.from,to:{address:email,name:''},subject:'Reset your Dental Stars password',text:`A password reset was requested for your Dental Stars Asset Manager account.\n\nChoose a new password using this link:\n${url.href}\n\nThis link expires in 30 minutes and can be used only once. Only the most recently requested link will work.\n\nIf you did not request this, ignore this email. Your password has not changed. Never share this link or your password.`,disableFileAccess:true,disableUrlAccess:true};
}
export async function sendPasswordResetEmail(email,token){
 const settings=passwordMailSettings(),transport=nodemailer.createTransport(settings.transport);
 try{
  const result=await transport.sendMail(passwordResetMessage(email,token,settings));
  if(!result.accepted?.length)throw Error('Reset email was not accepted.');
 }finally{transport.close()}
}
export async function verifyPasswordEmail(){
 const settings=passwordMailSettings(),transport=nodemailer.createTransport(settings.transport);
 try{await transport.verify()}finally{transport.close()}
}
