export type AnyFunction=(...args:any[])=>any;
export type EqualityFn<T=any>=(a:T,b:T)=>boolean;
export type Selector<State=any,Result=unknown,Params extends readonly any[]=any[]>=(state:State,...params:Params)=>Result;
export type SelectorArray<State=any>=readonly Selector<State,any>[];
export interface DefaultMemoizeFields {clearCache():void;resultsCount():number;resetResultsCount():void}
export interface LruMemoizeOptions<Result=any> {equalityCheck?:EqualityFn;resultEqualityCheck?:EqualityFn<Result>;maxSize?:number}
export interface WeakMapMemoizeOptions<Result=any> {resultEqualityCheck?:EqualityFn<Result>;maxSize?:number}
export function lruMemoize<F extends AnyFunction>(func:F,options?:EqualityFn|LruMemoizeOptions<ReturnType<F>>):F&DefaultMemoizeFields;
export function weakMapMemoize<F extends AnyFunction>(func:F,options?:WeakMapMemoizeOptions<ReturnType<F>>):F&DefaultMemoizeFields;
export const referenceEqualityCheck:EqualityFn;
export type DevModeCheckFrequency='once'|'always'|'never';
export interface DevModeChecks {identityFunctionCheck:DevModeCheckFrequency;inputStabilityCheck:DevModeCheckFrequency;cacheSizeCheck:DevModeCheckFrequency}
export function setGlobalDevModeChecks(checks:Partial<DevModeChecks>):void;
export type UnknownMemoizer=(func:AnyFunction,...options:any[])=>AnyFunction;
export interface CreateSelectorOptions {memoize?:UnknownMemoizer;argsMemoize?:UnknownMemoizer;memoizeOptions?:any;argsMemoizeOptions?:any;devModeChecks?:Partial<DevModeChecks>}
type Values<S extends readonly AnyFunction[]>={ [K in keyof S]:ReturnType<S[K]> };
type Longer<A extends any[],B extends any[]>=A extends [any,...infer AR]?B extends [any,...infer BR]?Longer<AR,BR> extends AR?A:B:A:B;
type Args<S extends readonly AnyFunction[],A extends any[]=[]>=S extends readonly [infer F extends AnyFunction,...infer Rest extends readonly AnyFunction[]]?Args<Rest,Longer<A,Parameters<F>>>:A;
export type OutputSelector<S extends readonly AnyFunction[]=readonly AnyFunction[],Result=unknown>=((...args:Args<S>)=>Result)&DefaultMemoizeFields&{
 resultFunc:(...values:Values<S>)=>Result;memoizedResultFunc:((...values:Values<S>)=>Result)&DefaultMemoizeFields;dependencies:S;lastResult():Result;recomputations():number;resetRecomputations():void;dependencyRecomputations():number;resetDependencyRecomputations():void;memoize:UnknownMemoizer;argsMemoize:UnknownMemoizer;
};
export interface CreateSelectorFunction<State=any> {
 <S extends readonly Selector<State,any>[],Result>(selectors:readonly [...S],result:(...values:Values<S>)=>Result,options?:CreateSelectorOptions):OutputSelector<S,Result>;
 <S extends readonly Selector<State,any>[],Result>(...parts:[...S,result:(...values:Values<S>)=>Result]):OutputSelector<S,Result>;
 <S extends readonly Selector<State,any>[],Result>(...parts:[...S,result:(...values:Values<S>)=>Result,options:CreateSelectorOptions]):OutputSelector<S,Result>;
 withTypes<NewState extends State>():CreateSelectorFunction<NewState>;
}
export function createSelectorCreator(options:CreateSelectorOptions&{memoize:UnknownMemoizer}):CreateSelectorFunction;
export function createSelectorCreator(memoize:UnknownMemoizer,...options:any[]):CreateSelectorFunction;
export const createSelector:CreateSelectorFunction;
export interface StructuredSelectorCreator<State=any> {
 <S extends Record<string,Selector<State,any>>>(selectors:S,creator?:CreateSelectorFunction):((state:Parameters<S[keyof S]>[0],...params:any[])=>{[K in keyof S]:ReturnType<S[K]>})&DefaultMemoizeFields;
 withTypes<NewState extends State>():StructuredSelectorCreator<NewState>;
}
export const createStructuredSelector:StructuredSelectorCreator;
