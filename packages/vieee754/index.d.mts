export function read(bytes: ArrayLike<number>, offset: number, littleEndian: boolean, mantissaBits: number, byteCount: number): number;
export function write(bytes: Uint8Array | number[], value: number, offset: number, littleEndian: boolean, mantissaBits: number, byteCount: number): void;
declare const codec: {read: typeof read; write: typeof write};
export default codec;
