import {verifyPasswordEmail} from '../app/password-email.mjs';
try{await verifyPasswordEmail();console.log('SMTP configuration and connection verified. No email was sent.')}
catch{console.error('SMTP verification failed. Check APP_ORIGIN, MAIL_FROM and SMTP settings. Credentials have not been printed.');process.exitCode=1}
