'use client';
import {useState} from 'react';
import './pagination-controls.css';

export const PAGE_SIZES=[10,20,30,40,50,100] as const;
type Position={signature:string;page:number;pageSize:number;key?:string};
const savedPages=new Map<string,Position>();

export function usePagination(count:number,signature:string,key?:string){
 const [position,setPosition]=useState<Position>(()=>(key&&savedPages.get(key))||{signature,page:0,pageSize:10,key});
 const pageSize=position.pageSize;
 const pages=Math.max(1,Math.ceil(count/pageSize));
 const page=position.signature===signature&&position.key===key?Math.min(position.page,pages-1):0;
 function update(nextPage:number,nextSize=pageSize){
  const value={signature,page:nextPage,pageSize:nextSize,key};
  if(key)savedPages.set(key,value);
  setPosition(value);
 }
 return {pageSize,pages,page,start:page*pageSize,move:(next:number)=>update(next),resize:(size:number)=>{
  if(PAGE_SIZES.some(option=>option===size))update(0,size);
 }};
}

export default function PaginationControls({count,pageSize,pages,page,start,move,resize,entries=false}:{count:number;pageSize:number;pages:number;page:number;start:number;move:(page:number)=>void;resize:(size:number)=>void;entries?:boolean}){
 return <nav className="tablepagination" aria-label={entries?'List pagination':'Table pagination'}>
  <span role="status" aria-live="polite">{start+1}–{Math.min(start+pageSize,count)} of {count} {entries?'entries':'records'}{pages>1?' · Page '+(page+1)+' of '+pages:''}</span>
  <div className="tablepaginationcontrols">
   {(count>10||pageSize!==10)&&<label className="tablepagesize">{entries?'Entries':'Rows'} per page<select value={pageSize} onChange={event=>resize(Number(event.target.value))}>{PAGE_SIZES.map(size=><option key={size} value={size}>{size}</option>)}</select></label>}
   {pages>1&&<div className="tablepagebuttons"><button type="button" className="secondary" disabled={page===0} onClick={()=>move(page-1)}>Previous</button><button type="button" className="secondary" disabled={page===pages-1} onClick={()=>move(page+1)}>Next</button></div>}
  </div>
 </nav>;
}
