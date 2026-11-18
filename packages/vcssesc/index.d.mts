export interface Options {escapeEverything?:boolean;isIdentifier?:boolean;quotes?:'single'|'double';wrap?:boolean;}
declare const cssesc:{(value:string,options?:Options):string;options:Options;version:string};
export default cssesc;
