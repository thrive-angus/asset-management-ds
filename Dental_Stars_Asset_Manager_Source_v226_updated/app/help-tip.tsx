'use client';
import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {CircleHelp} from 'lucide-react';
export default function HelpTip({text,label}:{text:string;label?:string}){
 const [open,setOpen]=useState(false),[position,setPosition]=useState({left:12,top:12,width:280});
 const anchor=useRef<HTMLButtonElement>(null),tip=useRef<HTMLSpanElement>(null),id=useId(),closeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 function keepOpen(){if(closeTimer.current)clearTimeout(closeTimer.current)}
 function leave(){keepOpen();closeTimer.current=setTimeout(()=>{if(document.activeElement!==anchor.current)setOpen(false)},180)}
 useEffect(()=>()=>keepOpen(),[]);
 function show(){keepOpen();const r=anchor.current?.getBoundingClientRect();if(!r)return;const v=window.visualViewport,w=v?.width||window.innerWidth,leftEdge=v?.offsetLeft||0,topEdge=v?.offsetTop||0,width=Math.min(320,w-24);setPosition({left:Math.max(leftEdge+12,Math.min(r.left,leftEdge+w-width-12)),top:r.bottom+8,width});setOpen(true)}
 useLayoutEffect(()=>{if(!open)return;const r=anchor.current?.getBoundingClientRect(),t=tip.current?.getBoundingClientRect(),v=window.visualViewport;if(!r||!t)return;const topEdge=v?.offsetTop||0,bottom=topEdge+(v?.height||window.innerHeight);const top=r.bottom+8+t.height<=bottom-12?r.bottom+8:Math.max(topEdge+12,r.top-t.height-8);setPosition(p=>p.top===top?p:{...p,top})},[open,text,position.width]);
 useEffect(()=>{if(!open)return;function outside(e:PointerEvent){if(!anchor.current?.contains(e.target as Node)&&!tip.current?.contains(e.target as Node))setOpen(false)}function close(){setOpen(false)}function key(e:KeyboardEvent){if(e.key==='Escape')close()}document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);window.addEventListener('scroll',close,true);window.addEventListener('resize',close);window.visualViewport?.addEventListener('resize',close);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);window.removeEventListener('scroll',close,true);window.removeEventListener('resize',close);window.visualViewport?.removeEventListener('resize',close)}},[open]);
 return <span className="helptip"><button ref={anchor} type="button" aria-label={label||'Help: '+text.split(/[.!?]/)[0]} aria-expanded={open} aria-describedby={open?id:undefined} onMouseEnter={show} onMouseLeave={leave} onFocus={show} onBlur={()=>setOpen(false)} onClick={show}><CircleHelp size={15}/></button>{open&&createPortal(<span ref={tip} id={id} className="helptipcontent helptipfloating" onMouseEnter={keepOpen} onMouseLeave={leave} role="tooltip" style={position}>{text}</span>,document.body)}</span>
}
