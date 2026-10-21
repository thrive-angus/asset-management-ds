// All notification timestamps use the app's Philippine business timezone.
const dateFormat=new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',year:'numeric',month:'short',day:'numeric'});
const timeFormat=new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',hour:'numeric',minute:'2-digit',hour12:true});

export function notificationTime(value:unknown):{dateTime:string;label:string}|null{
 if(typeof value!=='string'||!value)return null;
 const dateOnly=/^\d{4}-\d{2}-\d{2}$/.test(value);
 // A date-only record has no known time. Never present a fabricated midnight.
 if(!dateOnly&&!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value))return null;
 const date=new Date(dateOnly?value+'T00:00:00+08:00':value);
 if(!Number.isFinite(date.valueOf()))return null;
 if(dateOnly&&new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila'}).format(date)!==value)return null;
 return {dateTime:value,label:dateFormat.format(date)+(dateOnly?' · Time not recorded':' · '+timeFormat.format(date))};
}
