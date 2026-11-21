import {read, write} from '../index.cjs';
const bytes = new Uint8Array(8);
write(bytes, -0, 0, false, 52, 8);
const value: number = read(bytes, 0, false, 52, 8);
write([0, 0], value, 0, true, 10, 2);
