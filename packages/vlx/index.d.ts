export interface TextNode { kind:'text';raw:string;value:string;start:number;end:number; }
export interface MathNode { kind:'math';raw:string;tex:string;display:boolean;delimiter:string;start:number;end:number; }
export interface Diagnostic {code:'UNCLOSED_MATH';message:string;start:number;end:number;}
export interface ParsedDocument {source:string;nodes:(TextNode|MathNode)[];diagnostics:Diagnostic[];}
export interface MathOptions {display?:boolean;fontSize?:number;}
export interface RenderResult {readonly tex:string;readonly display:boolean;readonly svg:string;readonly html:string;readonly mathml:string;readonly width:number;readonly height:number;readonly baseline:number;}
export interface SyntaxNode {kind:string;[key:string]:unknown;}
export interface Renderer {
 renderMath(tex:string,options?:MathOptions):RenderResult;
 renderText(source:string,options?:{fontSize?:number}):{source:string;nodes:((TextNode&{html:string})|(MathNode&RenderResult))[];html:string};
 clearCache():void;
}
export declare class VlxError extends Error {readonly code:string;readonly start?:number;constructor(code:string,message:string,details?:{cause?:unknown;start?:number});}
export declare function parse(source:string,options?:{maxLength?:number}):ParsedDocument;
export declare function parseMath(tex:string):SyntaxNode;
export declare function renderMath(tex:string,options?:MathOptions):RenderResult;
export declare function createRenderer(options?:{cacheEntries?:number;cacheBytes?:number}):Renderer;
