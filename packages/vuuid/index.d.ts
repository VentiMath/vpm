export type Bytes = number[] | Uint8Array;
export interface RandomOptions {random?: Bytes; rng?: () => Bytes;}
export interface V1Options extends RandomOptions {node?: Bytes;clockseq?: number;msecs?: number;nsecs?: number;}
export function v1(options?: V1Options | null): string;
export function v1<T extends Bytes>(options: V1Options | null | undefined, buffer: T, offset?: number): T;
export function v4(options?: RandomOptions | null): string;
export function v4<T extends Bytes>(options: RandomOptions | null | undefined, buffer: T, offset?: number): T;
export interface NamedUUID {
 (value: string | Bytes, namespace: string | Bytes): string;
 <T extends Bytes>(value: string | Bytes, namespace: string | Bytes, buffer: T, offset?: number): T;
 readonly DNS: string; readonly URL: string;
}
export const v3: NamedUUID;
export const v5: NamedUUID;
export const NIL: '00000000-0000-0000-0000-000000000000';
export function parse(value: string): Uint8Array;
export function stringify(value: Bytes, offset?: number): string;
export function validate(value: unknown): value is string;
export function version(value: string): number;
