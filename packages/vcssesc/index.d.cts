declare function cssesc(value:string,options?:cssesc.Options):string;
declare namespace cssesc {
 interface Options {escapeEverything?:boolean;isIdentifier?:boolean;quotes?:'single'|'double';wrap?:boolean;}
 let options:Options;
 const version:string;
}
export = cssesc;
