export interface WordArrayLike {
  words: number[];
  sigBytes: number;
}
export type Message = string | Uint8Array | WordArrayLike;
export interface Encoder {
  parse(text: string): WordArray;
  stringify(value: WordArrayLike | Uint8Array): string;
}
export class WordArray implements WordArrayLike {
  words: number[];
  sigBytes: number;
  constructor(words?: number[] | Uint8Array, sigBytes?: number);
  static create(words?: number[] | Uint8Array, sigBytes?: number): WordArray;
  toString(encoder?: Encoder): string;
  clone(): WordArray;
  clamp(): void;
  concat(value: Message): this;
}
export function SHA256(message: Message): WordArray;
export function HmacSHA256(message: Message, key: Message): WordArray;
export const enc: { Hex: Encoder; Utf8: Encoder; Base64: Encoder };
export const lib: { WordArray: typeof WordArray };
declare const api: {
  SHA256: typeof SHA256;
  HmacSHA256: typeof HmacSHA256;
  enc: typeof enc;
  lib: typeof lib;
};
export default api;
