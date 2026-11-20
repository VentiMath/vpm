import { fromByteArray, byteLength, toByteArray } from '../index.cjs';
const text: string = fromByteArray(new Uint8Array([254, 255]));
const size: number = byteLength(text);
const bytes: Uint8Array = toByteArray(text);
void [size, bytes];
