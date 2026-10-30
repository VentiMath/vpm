export type Level = 'xml' | 'html4' | 'html5' | 'all';
export interface CommonOptions { level?: Level; }
export type EncodeMode = 'specialChars' | 'nonAscii' | 'nonAsciiPrintable' | 'nonAsciiPrintableOnly' | 'extensive';
export interface EncodeOptions extends CommonOptions { mode?: EncodeMode; numeric?: 'decimal' | 'hexadecimal'; }
export type DecodeScope = 'strict' | 'body' | 'attribute';
export interface DecodeOptions extends CommonOptions { scope?: DecodeScope; }
export function encode(text: string | number | undefined | null, options?: EncodeOptions): string;
export function decode(text: string | undefined | null, options?: DecodeOptions): string;
export function decodeEntity(entity: string | undefined | null, options?: CommonOptions): string;
