export interface CookieAttributes {
 expires?:number|Date;path?:string;domain?:string;secure?:boolean;sameSite?:'strict'|'lax'|'none'|'Strict'|'Lax'|'None';
 [attribute:string]:string|number|boolean|Date|undefined;
}
export interface CookieConverter<T=string> {read(value:string,name:string):T;write(value:T,name:string):string;}
export interface Cookies<T=string> {
 set(name:string,value:T,attributes?:CookieAttributes):string|undefined;
 get(name:string):T|undefined;get():Record<string,T>|undefined;
 remove(name:string,attributes?:CookieAttributes):void;
 withAttributes(attributes:CookieAttributes):Cookies<T>;
 withConverter<U=string>(converter:Partial<CookieConverter<U>>):Cookies<U>;
 readonly attributes:Readonly<CookieAttributes>;readonly converter:Readonly<CookieConverter<T>>;
}
declare const cookies:Cookies;
export default cookies;
