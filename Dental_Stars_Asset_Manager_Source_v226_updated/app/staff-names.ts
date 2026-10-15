export function capitalizeNameInput(value:string){return value.replace(/(^|[\s\-'’])(\p{L})/gu,(_match,boundary,letter)=>boundary+letter.toLocaleUpperCase())}
export function formatNamePart(value:string){
return value.normalize('NFC').trim().replace(/\s+/gu,' ').split(' ').map(word=>{
const letters=word.replace(/[^\p{L}]/gu,'');
const uniform=letters===letters.toLocaleUpperCase()||letters===letters.toLocaleLowerCase();
const text=uniform?word.toLocaleLowerCase():word;
return text.replace(/(^|[-'’])(\p{L})/gu,(_match,boundary,letter)=>boundary+letter.toLocaleUpperCase());
}).join(' ');
}
export function staffFullName(firstName:string,lastName:string){return [formatNamePart(firstName),formatNamePart(lastName)].filter(Boolean).join(' ')}
