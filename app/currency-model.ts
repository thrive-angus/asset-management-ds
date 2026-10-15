export type DisplayCurrency='PHP'|'AUD';
export const REFERENCE_RATE={phpPerAUD:43.8,date:'2026-10-09',source:'https://ph.investing.com/currencies/aud-php-historical-data'};
export function validRate(rate:number){return Number.isFinite(rate)&&rate>0&&rate<=100000}
export function displayAmount(php:number,currency:DisplayCurrency,rate:number){return currency==='AUD'&&validRate(rate)?php/rate:php}
export function phpAmount(amount:number,currency:DisplayCurrency,rate:number){return Math.round((currency==='AUD'?amount*rate:amount)*100)/100}
export function formatMoney(value:any,currency:DisplayCurrency='PHP',rate=REFERENCE_RATE.phpPerAUD){if(value===''||value==null||!Number.isFinite(Number(value)))return '—';return new Intl.NumberFormat(currency==='AUD'?'en-AU':'en-PH',{style:'currency',currency,currencyDisplay:'symbol',minimumFractionDigits:2,maximumFractionDigits:2}).format(displayAmount(Number(value),currency,rate)).replace('$','A$')}
export function parseMoney(value:string){const raw=value.trim();return /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{0,2})?$/.test(raw)?Number(raw.replace(/,/g,'')):null}
