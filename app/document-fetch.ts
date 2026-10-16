export async function fetchDocument(url:string){
 const response=await fetch(url,{cache:'no-store'});
 if(response.status===401||response.redirected)throw Error('Your session may have expired. Sign in again to view this document.');
 const type=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
 if(!response.ok){
  let message='';
  if(type==='application/json'){try{const data=await response.json() as {error?:unknown}|null;if(typeof data?.error==='string')message=data.error}catch{}}
  throw Error(message||(response.status===404?'This document file is missing from storage. Ask an administrator to restore the original.':`Unable to load this document (HTTP ${response.status}). Contact the administrator.`));
 }
 if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(type))throw Error('The server did not return a supported document. Sign in again or contact the administrator.');
 const blob=await response.blob();
 if(!blob.size)throw Error('This document file is empty. Upload the original again.');
 return blob;
}
