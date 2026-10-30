export type TypeMap = Readonly<Record<string, readonly string[]>>;
export class Mime {
  constructor(...maps: TypeMap[]);
  define(typeMap: TypeMap, force?: boolean): this;
  getType(path: string): string | null;
  getExtension(type: string): string | null;
  getAllExtensions(type: string): Set<string> | null;
  _freeze(): this;
  _getTestState(): { types: Map<string, string>; extensions: Map<string, string> };
}
export function define(typeMap: TypeMap, force?: boolean): never;
export function getType(path: string): string | null;
export function getExtension(type: string): string | null;
export function getAllExtensions(type: string): Set<string> | null;
export function _freeze(): typeof import('./index.js');
export function _getTestState(): { types: Map<string, string>; extensions: Map<string, string> };
