export interface TextNode { kind:'text';raw:string;value:string;start:number;end:number; }
export interface MathNode { kind:'math';raw:string;tex:string;display:boolean;delimiter:string;start:number;end:number; }
export interface Diagnostic {code:'UNCLOSED_MATH';message:string;start:number;end:number;}
export interface ParsedDocument {source:string;nodes:(TextNode|MathNode)[];diagnostics:Diagnostic[];}
export interface MathOptions {display?:boolean;fontSize?:number;}
export interface RenderResult {readonly tex:string;readonly display:boolean;readonly svg:string;readonly html:string;readonly mathml:string;readonly width:number;readonly height:number;readonly baseline:number;}
export interface SyntaxNode {kind:string;[key:string]:unknown;}
export interface TextRenderOptions {fontSize?:number;errorMode?:'throw'|'source';}
export type RenderedTextNode = (TextNode&{html:string})|(MathNode&RenderResult&{error?:never})|(MathNode&{html:string;error:VlxError});
export interface TextRenderResult {source:string;nodes:RenderedTextNode[];html:string;diagnostics:{code:string;message:string;start:number;end?:number}[];}
export interface Renderer {
 renderMath(tex:string,options?:MathOptions):RenderResult;
 renderText(source:string,options?:TextRenderOptions):TextRenderResult;
 renderDocument(source:string,options?:DocumentOptions):DocumentResult;
 clearCache():void;
}
export declare class VlxError extends Error {readonly code:string;readonly start?:number;constructor(code:string,message:string,details?:{cause?:unknown;start?:number});}
export declare function parse(source:string,options?:{maxLength?:number}):ParsedDocument;
export declare function parseMath(tex:string):SyntaxNode;
export declare function renderMath(tex:string,options?:MathOptions):RenderResult;
export declare function createRenderer(options?:{cacheEntries?:number;cacheBytes?:number}):Renderer;

/** A single independent numbering and reference scope. No cross-call state. */
export interface DocumentOptions extends TextRenderOptions {
 numbering?:'ams'|'all'|'none';
 startNumber?:number;
 /** Use a different prefix for each document inserted into the same page. */
 idPrefix?:string;
}
export interface Equation {id:string;number:number|null;tag:string;displayTag:string;labels:string[];start:number;end:number;row:number;}
export interface EquationReference {label:string;id:string;tag:string;display:string;start:number;end:number;}
export interface ReferenceNode {kind:'reference';raw:string;label:string;parentheses:boolean;start:number;end:number;}
export type DocumentNode = (TextNode|MathNode|ReferenceNode)&{html:string;error?:VlxError;equations?:Equation[];references?:EquationReference[]};
export interface DocumentResult {source:string;nodes:DocumentNode[];html:string;equations:Equation[];references:EquationReference[];nextNumber:number;diagnostics:{code:string;message:string;start:number;end?:number}[];}
export declare function renderDocument(source:string,options?:DocumentOptions):DocumentResult;
