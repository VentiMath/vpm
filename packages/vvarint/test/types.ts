import {encode, decode, encodingLength} from '../index.cjs';
const output: Uint8Array = encode(128, new Uint8Array(2));
const allocated: number[] = encode(10);
const count: number = decode(output) + decode.bytes + encodingLength(allocated[0]);
void count;
