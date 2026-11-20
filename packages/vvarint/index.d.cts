export interface Encode {
  (value: number, output?: undefined, offset?: number): number[];
  <T extends number[] | Uint8Array>(value: number, output: T, offset?: number): T;
  bytes: number;
}
export interface Decode {
  (input: readonly number[] | Uint8Array, offset?: number): number;
  bytes: number;
}
export const encode: Encode;
export const decode: Decode;
export function encodingLength(value: number): number;
