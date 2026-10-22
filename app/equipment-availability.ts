import {usable} from './asset-model';

type Equipment={id:string;model?:string;category?:string;status?:string;condition?:string;archived?:boolean};
export type EquipmentAvailability={category:string;available:number;assigned:number;registered:number};

export function equipmentAvailability(assets:Equipment[],configuredTypes:string[]=[]):EquipmentAvailability[]{
 const types=new Map<string,EquipmentAvailability>();
 for(const category of configuredTypes){
  if(category.trim())types.set(category,{category,available:0,assigned:0,registered:0});
 }
 for(const asset of assets){
  if(asset.archived||!asset.id||!asset.model?.trim()||!asset.category?.trim())continue;
  const category=asset.category;
  const counts=types.get(category)||{category,available:0,assigned:0,registered:0};
  counts.registered++;
  if(usable(asset))counts.available++;
  if(asset.status==='Assigned')counts.assigned++;
  types.set(category,counts);
 }
 return [...types.values()].sort((a,b)=>a.category.localeCompare(b.category,'en',{sensitivity:'base',numeric:true}));
}
