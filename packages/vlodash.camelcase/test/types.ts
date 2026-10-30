import camelCase = require('vlodash.camelcase');
const value: string = camelCase('GetIamPolicy');
const arbitrary: unknown = {valueOf:()=> 'hello world'};
const fromUnknown: string = camelCase(arbitrary);
void [value, fromUnknown, camelCase(), camelCase(0n), camelCase(Symbol('method'))];
// @ts-expect-error exactly one input argument
camelCase('foo', 'bar');
