export const ACKNOWLEDGEMENT_VERSION='equipment-care-v2';
export const EQUIPMENT_RESPONSIBILITIES=[
'I confirm that I received the equipment identified above in the recorded condition.',
'I will take reasonable care of the equipment and keep it secure.',
'I will use the equipment for authorised company work and follow company equipment policies.',
'I will promptly report damage, loss, theft, faults, or incorrect equipment details to the asset manager.',
'I will not loan, sell, transfer or otherwise dispose of the equipment without proper authorisation.',
'I will return the equipment and its supplied accessories in good working condition, excluding normal wear and tear, when requested, reassigned, transferred to another department or when my engagement ends.',
'I will cooperate with periodic equipment audits conducted by management.'
];
export function acknowledgedEquipment(asset:any){return [ACKNOWLEDGEMENT_VERSION,'equipment-care-v1'].includes(asset.receipt?.termsVersion)}

export function canRetainAcknowledgement(before:any,after:any){return !!before?.receipt&&after.status==='Assigned'&&['assignee','condition','serial','model','category'].every(k=>before[k]===after[k])}

export function acknowledgementMatches(asset:any,status:string){return status==='All Acknowledgements'||status==='All Equipment'||status==='Acknowledged'&&acknowledgedEquipment(asset)||status==='Awaiting Acknowledgement'&&!acknowledgedEquipment(asset)}
