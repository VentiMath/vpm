import type {Expression,MatcherView as PathView} from 'vpath-expression-matcher';
declare const Builder:Builder.XMLBuilderConstructor;
declare namespace Builder {
 export type MatcherView=PathView;
export interface SanitizeNameContext {isAttribute:boolean;matcher:MatcherView;}
export interface EntityReplacement {regex:RegExp;val:string|((substring:string,...args:any[])=>string);}
export interface XmlBuilderOptions {
 attributeNamePrefix?:string;
 attributesGroupName?:false|string;
 textNodeName?:string;
 ignoreAttributes?:boolean|readonly (string|RegExp)[]|((name:string,path:string|MatcherView)=>boolean);
 cdataPropName?:false|string;
 commentPropName?:false|string;
 format?:boolean;
 indentBy?:string;
 arrayNodeName?:string;
 suppressEmptyNode?:boolean;
 suppressUnpairedNode?:boolean;
 suppressBooleanAttributes?:boolean;
 preserveOrder?:boolean;
 unpairedTags?:readonly string[];
 stopNodes?:readonly (string|Expression)[];
 tagValueProcessor?:(name:string,value:unknown)=>unknown;
 attributeValueProcessor?:(name:string,value:unknown)=>unknown;
 /** The current parser also exposes a truthy policy object here; its builder meaning is enabled. */
 processEntities?:boolean|Readonly<Record<string,unknown>>;
 entities?:readonly EntityReplacement[];
 /** Legacy truthy string flags are retained. */
 oneListGroup?:boolean|'true'|'false';
 /** Nonnegative safe integer. Zero disables the depth bound, not cycle detection. */
 maxNestedTags?:number;
 /** false gives attribute-filter callbacks a read-only path view. */
 jPath?:boolean;
 /** Called only for invalid names; its result must itself be a valid qualified name. */
 sanitizeName?:false|((name:string,context:SanitizeNameContext)=>string);
}
export interface XMLBuilder {
 build(input:object):string;
 /** A frozen snapshot of normalized configuration. Construct another builder to change options. */
 readonly options:Readonly<Record<string,unknown>>;
}
export interface XMLBuilderConstructor {
 readonly Builder:XMLBuilderConstructor;
 readonly default:XMLBuilderConstructor;
 new(options?:XmlBuilderOptions):XMLBuilder;
 (options?:XmlBuilderOptions):XMLBuilder;
}
}
export = Builder;
