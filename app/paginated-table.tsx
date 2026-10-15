'use client';
import {Children,cloneElement,isValidElement,useState,type ComponentProps,type ReactElement,type ReactNode} from 'react';
export const TABLE_PAGE_SIZE=10;
const savedPages=new Map<string,{signature:string;page:number}>();
export default function PaginatedTable({children,paginationKey,...props}:ComponentProps<'table'>&{paginationKey?:string}){
 const sections=Children.toArray(children);
 const body=sections.find(s=>isValidElement(s)&&s.type==='tbody') as ReactElement<{children:ReactNode}>|undefined;
 const rows=body?Children.toArray(body.props.children):[];
 const signature=rows.map((row,i)=>isValidElement(row)?String(row.key??i):String(i)).join('|');
 const [position,setPosition]=useState(()=>paginationKey&&savedPages.get(paginationKey)||{signature,page:0});
 function move(next:number){const value={signature,page:next};if(paginationKey)savedPages.set(paginationKey,value);setPosition(value)}
 const pages=Math.max(1,Math.ceil(rows.length/TABLE_PAGE_SIZE));
 const page=position.signature===signature?Math.min(position.page,pages-1):0;
 const start=page*TABLE_PAGE_SIZE;
 const displayed=rows.slice(start,start+TABLE_PAGE_SIZE);
 const empty=rows.length===0||rows.length===1&&isValidElement(rows[0])&&Children.toArray((rows[0].props as any).children).some(cell=>isValidElement(cell)&&Number((cell.props as any).colSpan)>1);
 return <><table {...props}>{sections.map(section=>section===body?cloneElement(body!,{children:displayed}):section)}</table>{!empty&&<nav className="tablepagination" aria-label="Table pagination"><span>{start+1}–{Math.min(start+TABLE_PAGE_SIZE,rows.length)} of {rows.length} records{pages>1?' · Page '+(page+1)+' of '+pages:''}</span>{pages>1&&<div><button type="button" className="secondary" disabled={page===0} onClick={()=>move(page-1)}>Previous</button><button type="button" className="secondary" disabled={page===pages-1} onClick={()=>move(page+1)}>Next</button></div>}</nav>}</>;
}
