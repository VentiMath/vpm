import Cookies, {type CookieAttributes} from 'vjs-cookie';
const attributes:CookieAttributes={expires:new Date(),sameSite:'lax',secure:true,path:'/app'};
const raw:string|undefined=Cookies.set('name','value',attributes);
const text:string|undefined=Cookies.get('name');
const all:Record<string,string>|undefined=Cookies.get();
Cookies.remove('name');Cookies.withAttributes(attributes).get('name');
const numeric=Cookies.withConverter<number>({write:value=>String(value),read:value=>Number(value)});
const number:number|undefined=numeric.get('score');numeric.set('score',42);
// @ts-expect-error expected a number
numeric.set('score','42');
// @ts-expect-error invalid date type
Cookies.set('a','b',{expires:'tomorrow'});
void [raw,text,all,number];
