'use client';
import {Children,isValidElement,type ReactNode} from 'react';
import PaginationControls,{usePagination} from './pagination-controls';
export default function PaginatedList({children,paginationKey}:{children:ReactNode;paginationKey:string}){
 const items=Children.toArray(children),signature=items.map((item,i)=>isValidElement(item)?String(item.key??i):String(i)).join('|');
 const pagination=usePagination(items.length,signature,paginationKey);
 return <>{items.slice(pagination.start,pagination.start+pagination.pageSize)}{items.length>0&&<PaginationControls count={items.length} {...pagination} entries/>}</>;
}
