export const STORAGE_KEY = "myovertimebd_fresh_v1";
export const DEFAULT_STATE = {
  profile: { name:"", job:"", gross:15000, basic:7500, divisor:208, multiplier:2 },
  work: [], transactions: [], goals: []
};
export function num(v){const n=Number(v);return Number.isFinite(n)&&n>0?n:0;}
export function money(v){return Math.round(num(v)*100)/100;}
export function salary({gross=0,basic=0,divisor=208,multiplier=2,otHours=0,allowance=0,bonus=0,deductions=0}={}){
 const g=num(gross),b=num(basic),d=num(divisor),m=num(multiplier),h=num(otHours);
 const rate=d>0?(b/d)*m:0,ot=rate*h,extra=num(allowance)+num(bonus),ded=num(deductions);
 return {gross:g,basic:b,rate,ot,allowance:num(allowance),bonus:num(bonus),deductions:ded,total:Math.max(0,g+ot+extra-ded)};
}
export function monthKey(date=new Date()){
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit"}).formatToParts(date);
 const p=Object.fromEntries(parts.filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return `${p.year}-${p.month}`;
}
export function dateKey(date=new Date()){
 const p=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dhaka",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
 const o=Object.fromEntries(p.filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
 return `${o.year}-${o.month}-${o.day}`;
}
export function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s)))return false;const d=new Date(`${s}T12:00:00Z`);return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;}
export function cleanState(raw){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("Invalid data");
 const p=raw.profile&&typeof raw.profile==="object"&&!Array.isArray(raw.profile)?raw.profile:{};
 const arrays=["work","transactions","goals"];
 for(const k of arrays)if(raw[k]!==undefined&&!Array.isArray(raw[k]))throw new Error("Invalid "+k);
 const work=(raw.work||[]).map(x=>{
  if(!x||typeof x!=="object"||!validDate(x.date))throw new Error("Invalid work row");
  const type=["work","holiday","leave","absent"].includes(x.type)?x.type:"work";
  return {id:String(x.id||crypto.randomUUID()),date:x.date,type,hours:Math.min(24,num(x.hours)),ot:Math.min(24,num(x.ot)),note:String(x.note||"").slice(0,160)};
 });
 const transactions=(raw.transactions||[]).map(x=>{
  if(!x||typeof x!=="object"||!validDate(x.date)||!["income","expense"].includes(x.type)||num(x.amount)<=0)throw new Error("Invalid transaction");
  return {id:String(x.id||crypto.randomUUID()),type:x.type,amount:money(x.amount),date:x.date,category:String(x.category||"").slice(0,50),note:String(x.note||"").slice(0,160)};
 });
 const goals=(raw.goals||[]).map(x=>{
  if(!x||typeof x!=="object"||!String(x.name||"").trim()||num(x.target)<=0)throw new Error("Invalid goal");
  return {id:String(x.id||crypto.randomUUID()),name:String(x.name).slice(0,60),target:money(x.target),saved:money(x.saved),date:validDate(x.date)?x.date:""};
 });
 if(work.length>20000||transactions.length>20000||goals.length>5000)throw new Error("Too many records");
 return {profile:{name:String(p.name||"").slice(0,60),job:String(p.job||"").slice(0,60),gross:num(p.gross),basic:num(p.basic),divisor:Math.max(1,num(p.divisor)||208),multiplier:num(p.multiplier)||2},work,transactions,goals};
}
export function load(storage=globalThis.localStorage){
 try{const raw=storage?.getItem(STORAGE_KEY);return raw?cleanState(JSON.parse(raw)):structuredClone(DEFAULT_STATE);}catch{return structuredClone(DEFAULT_STATE);}
}
export function save(state,storage=globalThis.localStorage){try{storage?.setItem(STORAGE_KEY,JSON.stringify(cleanState(state)));return true;}catch{return false;}}
export function escapeHTML(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
export function csvCell(v){let s=String(v??"");if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return `"${s.replaceAll('"','""')}"`;}
