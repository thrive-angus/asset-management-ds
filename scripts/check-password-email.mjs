import {verifyPasswordEmail} from '../app/password-email.mjs';
import {passwordEmailConfigurationIssues,passwordEmailConnectionIssue} from './password-email-diagnostics.mjs';
const issues=passwordEmailConfigurationIssues();
if(issues.length){console.error('SMTP configuration check failed. No connection was attempted.');for(const issue of issues)console.error(issue);process.exitCode=1}
else{
 console.log('SMTP configuration check passed. Testing TLS connection and authentication…');
 try{await verifyPasswordEmail();console.log('SMTP configuration and connection verified. No email was sent.')}
 catch(error){console.error(passwordEmailConnectionIssue(error));console.error('No email was sent. Credentials have not been printed.');process.exitCode=1}
}
