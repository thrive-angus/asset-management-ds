export async function readApiResponse(response:Response){
const path=(()=>{try{return new URL(response.url,window.location.origin).pathname}catch{return 'data request'}})();
if(response.redirected||response.status===401)throw Error('Your session may have expired. Refresh the page and sign in again.');
const text=await response.text();let data:any;
try{data=JSON.parse(text)}catch{throw Error(response.status>=500?`Unable to complete ${path}: the server encountered an error (HTTP ${response.status}). Contact the administrator to check the server logs.`:`Unable to load ${path}: the server returned an unexpected response (HTTP ${response.status}). Please retry.`)}
if(!response.ok){const error:any=Error(data?.error||`Request failed (HTTP ${response.status}). Please retry.`);error.code=data?.code;error.status=response.status;throw error;}
return data;
}
