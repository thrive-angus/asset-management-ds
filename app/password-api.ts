import {NextResponse} from 'next/server';
import {PasswordActionError} from './password-recovery';
import {AuthRequestError} from './auth-request';

export function passwordApiError(error:unknown){
 if(error instanceof PasswordActionError||error instanceof AuthRequestError)return NextResponse.json({error:error.message},{status:error.status,headers:{'Cache-Control':'no-store'}});
 console.error('Password action failed',error instanceof Error?error.name:'Unknown error');
 return NextResponse.json({error:'Unable to complete this password request. Please try again later.'},{status:500,headers:{'Cache-Control':'no-store'}});
}
export function passwordUpdatedResponse(){
 const response=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 for(const name of ['ds_session','ds_role_preview'])response.cookies.set({name,value:'',path:'/',httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:0});
 return response;
}
export function passwordRateLimited(){return NextResponse.json({error:'Too many password requests. Please try again in 15 minutes.'},{status:429,headers:{'Retry-After':'900','Cache-Control':'no-store'}})}
