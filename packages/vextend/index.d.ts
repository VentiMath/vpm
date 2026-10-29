/** Mutates a target using own enumerable string and symbol properties. */
declare function extend<T extends object>(target:T):T;
declare function extend<T extends object,A>(target:T,a:A):T&A;
declare function extend<T extends object,A,B>(target:T,a:A,b:B):T&A&B;
declare function extend<T extends object,A,B,C>(target:T,a:A,b:B,c:C):T&A&B&C;
declare function extend<T extends object>(deep:boolean,target:T):T;
declare function extend<T extends object,A>(deep:boolean,target:T,a:A):T&A;
declare function extend<T extends object,A,B>(deep:boolean,target:T,a:A,b:B):T&A&B;
declare function extend<T extends object,A,B,C>(deep:boolean,target:T,a:A,b:B,c:C):T&A&B&C;
declare function extend(...arguments_:unknown[]):Record<PropertyKey,unknown>;
export = extend;
