import type {Context,FC,ReactNode} from 'react';
export type Scope<C=any> = Record<string,Context<C>[]> | undefined;
export interface CreateScope {scopeName:string; (): (scope:Scope)=>Record<string,Scope>;}
type Provider<T extends object|null> = FC<T & {children:ReactNode}>;
type ScopedProvider<T extends object|null> = FC<T & {scope:Scope<T>;children:ReactNode}>;
interface Read<T> {(consumerName:string):T; (consumerName:string,options:{optional:true}):T|undefined;}
interface ScopedRead<T> {(consumerName:string,scope:Scope<T|undefined>):T; (consumerName:string,scope:Scope<T|undefined>,options:{optional?:true|undefined}):T|undefined;}
export declare function createContext<T extends object|null>(rootComponentName:string):readonly [Provider<T>,Read<T>];
export declare function createContext<T extends object|null>(rootComponentName:string,defaultContext:T):readonly [Provider<T>,(consumerName:string)=>T];
interface ScopedFactory {
  <T extends object|null>(rootComponentName:string):readonly [ScopedProvider<T>,ScopedRead<T>];
  <T extends object|null>(rootComponentName:string,defaultContext:T):readonly [ScopedProvider<T>,(consumerName:string,scope:Scope<T|undefined>)=>T];
}
export declare function createContextScope(scopeName:string,createContextScopeDeps?:CreateScope[]):readonly [ScopedFactory,CreateScope];
