export interface Figure {png:Uint8Array;width:number;includesChoiceLabel?:boolean;}
export type StatementPart={kind:'text';text:string}|{kind:'image';figure:Figure;display?:'inline'|'block'};
export interface ProblemPicture {statement:string;statementParts?:StatementPart[];options?:Record<string,string>;optionFigures?:Record<string,Figure>;figure?:Figure|null;}
export declare function renderProblemSvg(problem:ProblemPicture):{svg:string;width:number;height:number};
export declare function renderProblemPng(problem:ProblemPicture):Uint8Array;
export declare function pngSize(bytes:Uint8Array):{width:number;height:number};
export declare function segments(source:string):{kind:'text'|'math'|'display';source:string}[];
export declare function typography(source:string):string;
