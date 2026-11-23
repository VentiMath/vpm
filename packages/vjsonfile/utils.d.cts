import type {FormatOptions} from './index.cjs';
export function stringify(value:unknown,options?:FormatOptions):string;
export function stripBom(content:string|Uint8Array):string;
declare const api:{stringify:typeof stringify;stripBom:typeof stripBom};export default api;
