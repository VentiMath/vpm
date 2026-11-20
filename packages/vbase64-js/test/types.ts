import { fromByteArray, byteLength, toByteArray } from '../index.cjs';
const text: string = fromByteArray(new Uint8Array([254, 255]));
const size: number = byteLength(text);
const bytes: Uint8Array = toByteArray(text);
void [size, bytes];

import commonjs = require('../index.cjs');
const viaRequire: string = commonjs.fromByteArray(bytes);
// @ts-expect-error require returns the codec directly.
void commonjs.default;
void viaRequire;
