'use client';
import {Children,cloneElement,isValidElement,type ComponentProps,type ReactElement,type ReactNode} from 'react';
import PaginationControls,{usePagination} from './pagination-controls';
export default function PaginatedTable({children,paginationKey,...props}:ComponentProps<'table'>&{paginationKey?:string}){
 const sections=Children.toArray(children);
 const body=sections.find(s=>isValidElement(s)&&s.type==='tbody') as ReactElement<{children:ReactNode}>|undefined;
 const rows=body?Children.toArray(body.props.children):[];
 const signature=rows.map((row,i)=>isValidElement(row)?String(row.key??i):String(i)).join('|');
 const pagination=usePagination(rows.length,signature,paginationKey);
 const displayed=rows.slice(pagination.start,pagination.start+pagination.pageSize);
 const empty=rows.length===0||rows.length===1&&isValidElement(rows[0])&&Children.toArray((rows[0].props as {children?:ReactNode}).children).some(cell=>isValidElement(cell)&&Number((cell.props as {colSpan?:number|string}).colSpan)>1);
 return <><table {...props}>{sections.map(section=>section===body?cloneElement(body!,{children:displayed}):section)}</table>{!empty&&<PaginationControls count={rows.length} {...pagination}/>}</>;
}
