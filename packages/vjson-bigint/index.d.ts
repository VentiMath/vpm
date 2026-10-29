declare function JSONBig(options?: JSONBig.Options): JSONBig.Codec;
declare namespace JSONBig {
  type Action = 'error' | 'ignore' | 'preserve';
  interface Options { strict?: boolean; storeAsString?: boolean; alwaysParseAsBig?: boolean; useNativeBigInt?: boolean; protoAction?: Action; constructorAction?: Action; maxDepth?: number; maxLength?: number; maxNumberLength?: number; }
  type Reviver = (this: any, key: string, value: any) => any;
  type Replacer = ((this: any, key: string, value: any) => any) | readonly (string | number | String | Number)[] | null;
  interface Codec { parse(source: string, reviver?: Reviver): any; stringify(value: unknown, replacer?: Replacer, space?: number | string): string | undefined; }
  class ExactNumber { constructor(source: string); toString(): string; valueOf(): string; toJSON(): string; }
  function isExactNumber(value: unknown): value is ExactNumber;
  const parse: Codec['parse'];
  const stringify: Codec['stringify'];
}
export = JSONBig;
