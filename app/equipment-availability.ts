import {usable} from './asset-model';

type Equipment={id:string;model?:string;category?:string;status?:string;condition?:string;archived?:boolean};
export type EquipmentAvailability={category:string;available:number;assigned:number};

export function equipmentAvailability(assets:Equipment[]):EquipmentAvailability[]{
 const types=new Map<string,EquipmentAvailability>();
 for(const asset of assets){
  if(asset.archived||!asset.id||!asset.model?.trim()||!asset.category?.trim())continue;
  const category=asset.category;
  const counts=types.get(category)||{category,available:0,assigned:0};
  if(usable(asset))counts.available++;
  if(asset.status==='Assigned')counts.assigned++;
  types.set(category,counts);
 }
 return [...types.values()].sort((a,b)=>a.category.localeCompare(b.category));
}
