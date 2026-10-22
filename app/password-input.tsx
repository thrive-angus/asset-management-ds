'use client';
import {useState} from 'react';
import {Eye,EyeOff} from 'lucide-react';
import './password-security.css';

export default function PasswordInput({id,label,value,onChange,disabled=false,newPassword=false}:{id:string;label:string;value:string;onChange:(value:string)=>void;disabled?:boolean;newPassword?:boolean}){
 const [visible,setVisible]=useState(false);
 return <label htmlFor={id}>{label}<span className="securitypasswordfield"><input id={id} type={visible?'text':'password'} autoComplete={newPassword?'new-password':'current-password'} minLength={newPassword?12:undefined} maxLength={1024} required value={value} disabled={disabled} onChange={event=>onChange(event.target.value)}/><button type="button" className="securitypasswordtoggle" disabled={disabled} aria-label={(visible?'Hide ':'Show ')+label.toLowerCase()} aria-pressed={visible} onClick={()=>setVisible(value=>!value)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>;
}
