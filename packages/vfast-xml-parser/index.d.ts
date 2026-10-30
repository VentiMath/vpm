import type {Expression, MatcherView} from 'vpath-expression-matcher';
import type {EntityMap, ApplyLimitsTo} from 'vnodable-entities';
import type toNumber = require('vstrnum');
import Builder = require('vfast-xml-builder');
export type {MatcherView};
export type ReadonlyMatcher = MatcherView;
export type JPathOrMatcher = string | MatcherView;
export type JPathOrExpression = string | Expression;
export type strnumOptions = toNumber.Options;
export type XmlBuilderOptions = Builder.XmlBuilderOptions;
export const XMLBuilder: Builder.XMLBuilderConstructor;
export type XMLBuilder = Builder.XMLBuilder;
export interface ProcessEntitiesOptions {
 enabled?: boolean;
 /** Positive safe integers or Infinity. */
 maxEntitySize?: number;
 /** Retained compatibility option; recursive DTD entities are unsupported. */
 maxExpansionDepth?: number;
 maxTotalExpansions?: number;
 maxExpandedLength?: number;
 maxEntityCount?: number;
 appliesTo?: ApplyLimitsTo;
 allowedTags?: readonly string[] | ((tagName:string,path:JPathOrMatcher)=>boolean) | null;
 tagFilter?: ((tagName:string,path:JPathOrMatcher)=>boolean) | null;
}
export interface EntityDecoderOptions {
 addInputEntities(entities:Record<string,string>):void;
 reset():unknown;
 decode(text:string):string;
 setXmlVersion(version:number):void;
}
export interface X2jOptions {
 preserveOrder?:boolean;
 attributeNamePrefix?:string;
 attributesGroupName?:false|string;
 textNodeName?:string;
 ignoreAttributes?:boolean|readonly (string|RegExp)[]|((name:string,path:JPathOrMatcher)=>boolean);
 removeNSPrefix?:boolean;
 allowBooleanAttributes?:boolean;
 parseTagValue?:boolean;
 parseAttributeValue?:boolean;
 trimValues?:boolean;
 cdataPropName?:false|string;
 commentPropName?:false|string;
 tagValueProcessor?:(name:string,value:string,path:JPathOrMatcher,hasAttributes:boolean,isLeaf:boolean)=>unknown;
 attributeValueProcessor?:(name:string,value:string,path:JPathOrMatcher)=>unknown;
 numberParseOptions?:strnumOptions;
 stopNodes?:readonly JPathOrExpression[];
 unpairedTags?:readonly string[];
 alwaysCreateTextNode?:boolean;
 isArray?:(name:string,path:JPathOrMatcher,isLeaf:boolean,isAttribute?:boolean)=>boolean;
 processEntities?:boolean|ProcessEntitiesOptions;
 htmlEntities?:boolean|EntityMap;
 entityDecoder?:EntityDecoderOptions|null;
 ignoreDeclaration?:boolean;
 ignorePiTags?:boolean;
 transformTagName?:false|((name:string)=>string);
 transformAttributeName?:false|((name:string)=>string);
 updateTag?:(name:string,path:JPathOrMatcher,attributes:Record<string,unknown>)=>string|boolean|void;
 captureMetaData?:boolean;
 /** Maximum parsed element depth (root = 1); default 100. Zero removes the limit. Raw stop-node contents are not parsed. */
 maxNestedTags?:number;
 strictReservedNames?:boolean;
 jPath?:boolean;
 onDangerousProperty?:((name:string)=>string)|null;
}
export interface validationOptions {allowBooleanAttributes?:boolean;unpairedTags?:string[];}
export interface ValidationError {err:{code:string;msg:string;line:number;col?:number;};}
export interface XMLMetaData {startIndex?:number;endIndex?:number;}
export class XMLParser {
 constructor(options?:X2jOptions);
 /** Snapshot taken at construction; create another parser to change options. */
 readonly options:Readonly<X2jOptions>;
 readonly externalEntities:Readonly<Record<string,string>>;
 parse(xml:string|Uint8Array,validation?:boolean|validationOptions):any;
 addEntity(name:string,value:string):void;
 static getMetaDataSymbol():symbol;
}
export const XMLValidator:{validate(xml:string,options?:validationOptions):true|ValidationError};
