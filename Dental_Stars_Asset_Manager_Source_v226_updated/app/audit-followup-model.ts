export function auditFollowupStatus(audit:any,assetId:string):string {
 if(audit.resolutions?.[assetId])return 'Resolved';
 if(audit.checked?.[assetId])return 'No follow-up needed';
 return audit.status==='Completed'?'Review required':'Awaiting verification';
}
