'use client';
import {useEffect} from 'react';
// Shared keyboard and focus behaviour for every existing dialog, including nested dialogs.
export default function ModalScrollLock(){
 useEffect(()=>{
  const body=document.body,previousOverflow=body.style.overflow;
  let stack:{dialog:HTMLElement;opener:HTMLElement|null}[]=[],inerted:{element:HTMLElement;previous:boolean}[]=[];
  const visible=(e:HTMLElement)=>e.getClientRects().length>0;
  function restoreBackground(){for(const x of inerted)x.element.inert=x.previous;inerted=[]}
  function focus(dialog:HTMLElement){dialog.tabIndex=-1;dialog.focus({preventScroll:true})}
  function update(){
   const dialogs=Array.from(document.querySelectorAll<HTMLElement>('.overlay .modal')).filter(visible),top=dialogs.at(-1)||null,old=stack.at(-1);
   if(top===old?.dialog||!top&&!old)return;
   restoreBackground();
   if(top){const previous=stack.findIndex(s=>s.dialog===top);if(previous>=0){const closing=stack.at(-1);stack=stack.slice(0,previous+1);if(closing?.opener?.isConnected&&top.contains(closing.opener))closing.opener.focus({preventScroll:true});else focus(top)}else{stack.push({dialog:top,opener:document.activeElement instanceof HTMLElement?document.activeElement:null});focus(top)}
    let node:HTMLElement=top;while(node.parentElement){for(const sibling of Array.from(node.parentElement.children)){if(sibling!==node&&sibling instanceof HTMLElement&&!sibling.matches('.helptipfloating,script,style,link')){inerted.push({element:sibling,previous:sibling.inert});sibling.inert=true}}node=node.parentElement;if(node===body)break}body.style.overflow='hidden';
   }else{const opener=stack[0]?.opener;stack=[];body.style.overflow=previousOverflow;if(opener?.isConnected)opener.focus({preventScroll:true})}
  }
  function key(e:KeyboardEvent){const top=stack.at(-1)?.dialog;if(!top)return;
   if(e.key==='Escape'){if(document.querySelector('.helptipfloating')||e.target instanceof HTMLSelectElement)return;e.preventDefault();e.stopImmediatePropagation();const close=top.querySelector<HTMLButtonElement>('.modalhead button[aria-label*="Close"],.modalhead button[aria-label*="close"],.modalhead .iconbtn');if(close&&!close.disabled)close.click();return}
   if(e.key!=='Tab')return;const controls=Array.from(top.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')).filter(el=>visible(el)&&!el.matches(':disabled')&&!el.closest('[inert]')&&el.tabIndex>=0),first=controls[0],last=controls.at(-1);
   if(!first){e.preventDefault();focus(top)}else if(e.shiftKey&&(document.activeElement===first||document.activeElement===top)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===top)){e.preventDefault();first.focus()}
  }
  function contain(e:FocusEvent){const top=stack.at(-1)?.dialog;if(top&&e.target instanceof Node&&!top.contains(e.target))focus(top)}
  const observer=new MutationObserver(update);observer.observe(body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});document.addEventListener('keydown',key,true);document.addEventListener('focusin',contain);update();
  return()=>{observer.disconnect();restoreBackground();body.style.overflow=previousOverflow;document.removeEventListener('keydown',key,true);document.removeEventListener('focusin',contain)};
 },[]);return null;
}
