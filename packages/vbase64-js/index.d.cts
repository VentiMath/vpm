export function byteLength(text: string): number;
export function toByteArray(text: string): Uint8Array;
export function fromByteArray(bytes: Uint8Array): string;
declare const codec: { byteLength: typeof byteLength; toByteArray: typeof toByteArray; fromByteArray: typeof fromByteArray };
export default codec;
