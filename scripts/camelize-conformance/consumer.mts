import camelize from "vcamelize";
const name:string=camelize('background-color');
const object:Record<string,unknown>=camelize({foo_bar:1});
const date:Date=camelize(new Date());
const list:unknown[]=camelize([{foo_bar:1}]);
// @ts-expect-error converted keys do not preserve the input property names
const unchanged:{foo_bar:number}=camelize({foo_bar:1});
void [name,object,date,list,unchanged];
