'use client';
import {Children,isValidElement,useState,type ReactNode} from 'react';
import {TABLE_PAGE_SIZE} from './paginated-table';
const savedPages=new Map<string,{signature:string;page:number}>();
export default function PaginatedList({children,paginationKey}:{children:ReactNode;paginationKey:string}){
 const items=Children.toArray(children),signature=items.map((item,i)=>isValidElement(item)?String(item.key??i):String(i)).join('|');
 const [position,setPosition]=useState(()=>savedPages.get(paginationKey)||{signature,page:0});
 const pages=Math.max(1,Math.ceil(items.length/TABLE_PAGE_SIZE)),page=position.signature===signature?Math.min(position.page,pages-1):0,start=page*TABLE_PAGE_SIZE;
 function move(next:number){const value={signature,page:next};savedPages.set(paginationKey,value);setPosition(value)}
 return <>{items.slice(start,start+TABLE_PAGE_SIZE)}{items.length>0&&<nav className="tablepagination" aria-label="List pagination"><span>{start+1}–{Math.min(start+TABLE_PAGE_SIZE,items.length)} of {items.length} entries{pages>1?' · Page '+(page+1)+' of '+pages:''}</span>{pages>1&&<div><button type="button" className="secondary" disabled={page===0} onClick={()=>move(page-1)}>Previous</button><button type="button" className="secondary" disabled={page===pages-1} onClick={()=>move(page+1)}>Next</button></div>}</nav>}</>;
}
