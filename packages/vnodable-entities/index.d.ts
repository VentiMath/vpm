export type EntityHookAction='allow'|'block'|'throw';
export const ENTITY_ACTION:Readonly<{ALLOW:'allow';BLOCK:'block';THROW:'throw'}>;
/** Legacy callable values are accepted but ignored; regex fields are not executed. */
export type EntityValFn=(match:string,captured:string,...rest:unknown[])=>string;
export type EntityValue=string|{regex?:RegExp;regx?:RegExp;val:string|EntityValFn};
export type EntityMap=Readonly<Record<string,EntityValue>>;
export type NamedEntities=Readonly<Record<string,string>>;
export type EntityRegistrationHook=(name:string,value:string)=>EntityHookAction;
export type ApplyLimitsTo='external'|'base'|'all'|readonly ('external'|'base')[];
export interface EntityDecoderLimitOptions {
 /** Nonnegative safe integer. Zero or Infinity means unlimited. */
 maxTotalExpansions?:number;
 /** Sum of positive replacement growth in UTF-16 code units; zero or Infinity means unlimited. */
 maxExpandedLength?:number;
 applyLimitsTo?:ApplyLimitsTo;
}
export interface EntityDecoderNCROptions {
 xmlVersion?:number;
 onNCR?:'allow'|'leave'|'remove'|'throw';
 /** allow/leave are clamped to remove for upstream compatibility. */
 nullNCR?:'allow'|'leave'|'remove'|'throw';
}
export interface EntityDecoderOptions {
 namedEntities?:EntityMap|null;
 numericAllowed?:boolean|EntityMap|null;
 leave?:readonly unknown[]|null;
 remove?:readonly unknown[]|null;
 limit?:EntityDecoderLimitOptions;
 ncr?:EntityDecoderNCROptions;
 /** Runs once for every string input, including empty and entity-free text. */
 postCheck?:((resolved:string,original:string)=>string)|null;
 onExternalEntity?:EntityRegistrationHook|null;
 onInputEntity?:EntityRegistrationHook|null;
}
export class EntityDecoder {
 constructor(options?:EntityDecoderOptions);
 setExternalEntities(map:EntityMap|null):void;
 addExternalEntity(key:string,value:string):void;
 /** Replaces document entities and resets counters only after successful registration. */
 addInputEntities(map:EntityMap|null):void;
 /** Clears document entities/counters and restores the configured initial XML version. */
 reset():this;
 setXmlVersion(version:number):void;
 decode(str:string):string;
 decode<T>(value:T):T extends string?string:T;
}
export type EntityEncoderOptions={encodeXmlSafe?:boolean;maxReplacements?:number}&(
 {encodeAllNamed:false;namedEntities?:NamedEntities|null}|{encodeAllNamed?:true;namedEntities:NamedEntities}
);
export class EntityEncoder {
 constructor(options:EntityEncoderOptions);
 readonly encodeXmlSafe:boolean;
 readonly encodeAllNamed:boolean;
 readonly maxReplacements:number;
 /** Cumulative replacements when a finite nonzero limit is configured. */
 readonly replacementsCount:number;
 /** Independent inspection maps; changing them cannot change encoding. */
 readonly trie1:Map<number,string>|null;
 readonly trie2:Map<number,Map<number,string>>|null;
 readonly trie3:Map<number,Map<number,Map<number,string>>>|null;
 /** Once maxReplacements is exhausted, the remaining input is returned literally. */
 encode(str:string):string;
 encode<T>(value:T):T extends string?string:T;
 reset():void;
}
export const COMMON_HTML:NamedEntities,ALL_ENTITIES:NamedEntities,XML:NamedEntities,
 BASIC_LATIN:NamedEntities,LATIN_ACCENTS:NamedEntities,LATIN_EXTENDED:NamedEntities,
 GREEK:NamedEntities,CYRILLIC:NamedEntities,MATH:NamedEntities,MATH_ADVANCED:NamedEntities,
 ARROWS:NamedEntities,SHAPES:NamedEntities,PUNCTUATION:NamedEntities,CURRENCY:NamedEntities,
 FRACTIONS:NamedEntities,MISC_SYMBOLS:NamedEntities;
