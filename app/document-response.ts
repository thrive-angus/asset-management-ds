// The document endpoint must validate access and the record link before calling this.
import type {StorageEnv} from './storage-env';
export async function documentResponse(env:StorageEnv,key:string,download=false){
 if(!env.BUCKET)return Response.json({error:'Document storage is unavailable. Contact the administrator.'},{status:503});
 const object=await env.BUCKET.get(key);
 if(!object)return Response.json({error:'The document file is missing from storage. An administrator can restore it from a complete backup, or upload the original again.'},{status:404});
 return new Response(object.body,{headers:{'Content-Type':object.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':download?'attachment':'inline'}});
}
