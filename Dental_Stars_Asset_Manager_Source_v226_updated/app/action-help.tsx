'use client';
import type {ReactNode} from 'react';
import HelpTip from './help-tip';
export default function ActionHelp({label,text,children}:{label:string;text:string;children:ReactNode}){return <span className="actionwithhelp">{children}<HelpTip label={'Help: '+label} text={text}/></span>}
