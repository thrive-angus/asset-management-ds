import {todayPH} from './asset-model';
// Coverage is stored independently; expiry status is calculated without changing records.
export function warrantyCoverage(asset:any):string {
 return asset.warrantyCoverage==='Not Applicable'||asset.warrantyCoverage==='No Warranty'?'Not Applicable':asset.warrantyCoverage==='Unknown'?'Unknown':asset.warrantyCoverage==='Applicable'||asset.warrantyExpiry?'Applicable':'Unknown';
}
export function warrantyStatus(asset:any,today=todayPH()):string {
 const coverage=warrantyCoverage(asset);
 if(coverage==='Not Applicable')return 'No Warranty';
 if(coverage==='Unknown'||!asset.warrantyExpiry)return 'Unknown';
 return asset.warrantyExpiry<today?'Expired':'Active';
}
export function warrantyUntil(asset:any):string {
 return warrantyCoverage(asset)==='Applicable'&&asset.warrantyExpiry?asset.warrantyExpiry:'—';
}
