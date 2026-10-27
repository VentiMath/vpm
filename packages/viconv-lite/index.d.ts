// Public API based on iconv-lite declarations, copyright Microsoft Corporation,
// used under the MIT license. VPM declarations require no ambient platform types.
import type { Encoding } from './types/encodings';

declare namespace iconv {
  export type { Encoding };
  /** Structural fallback when no Node platform declarations are loaded. */
  export interface Bytes extends Uint8Array<ArrayBuffer> {
    toString(encoding?: string, start?: number, end?: number): string;
    subarray(start?: number, end?: number): Bytes;
    slice(start?: number, end?: number): Bytes;
    equals(other: Uint8Array): boolean;
  }
  /** Resolves to the native Buffer type when the caller has Node declarations. */
  export type ByteBuffer = typeof globalThis extends { Buffer: { prototype: infer B } } ? B : Bytes;
  export interface DecodeOptions {
    stripBOM?: boolean | (() => void);
    defaultEncoding?: 'utf16le' | 'utf16be' | 'utf-16le' | 'utf-16be' | 'utf32le' | 'utf32be' | 'utf-32le' | 'utf-32be';
  }
  export interface EncodeOptions {
    addBOM?: boolean;
    defaultEncoding?: DecodeOptions['defaultEncoding'];
  }
  export interface EncoderStream { write(value: string): ByteBuffer; end(): ByteBuffer | undefined; }
  export interface DecoderStream { write(value: Uint8Array): string; end(): string | undefined; }
  export interface Codec {
    encoder: new (options?: EncodeOptions, codec?: Codec) => EncoderStream;
    decoder: new (options?: DecodeOptions, codec?: Codec) => DecoderStream;
    bomAware?: boolean;
    [key: string]: any;
  }
  export interface StreamOptions extends EncodeOptions, DecodeOptions {
    highWaterMark?: number;
    readableHighWaterMark?: number;
    writableHighWaterMark?: number;
    objectMode?: boolean;
    readableObjectMode?: boolean;
    writableObjectMode?: boolean;
    decodeStrings?: boolean;
    emitClose?: boolean;
    autoDestroy?: boolean;
  }
  export interface ConversionStream<T> extends AsyncIterable<T> {
    readonly destroyed: boolean;
    readonly readable: boolean;
    readonly writable: boolean;
    readonly writableEnded: boolean;
    readonly readableEnded: boolean;
    write(chunk: string | Uint8Array, callback?: (error?: Error | null) => void): boolean;
    write(chunk: string | Uint8Array, encoding?: string, callback?: (error?: Error | null) => void): boolean;
    end(callback?: () => void): this;
    end(chunk: string | Uint8Array, callback?: () => void): this;
    end(chunk: string | Uint8Array, encoding?: string, callback?: () => void): this;
    destroy(error?: Error): this;
    read(size?: number): T | null;
    pause(): this;
    resume(): this;
    pipe<D extends { write(...args: any[]): unknown; end(...args: any[]): unknown; on(...args: any[]): unknown }>(destination: D, options?: { end?: boolean }): D;
    unpipe(destination?: unknown): this;
    on(event: 'data', listener: (chunk: T) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    once: ConversionStream<T>['on'];
    addListener: ConversionStream<T>['on'];
    prependListener: ConversionStream<T>['on'];
    prependOnceListener: ConversionStream<T>['on'];
    removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
    off: ConversionStream<T>['removeListener'];
    removeAllListeners(event?: string | symbol): this;
    emit(event: string | symbol, ...args: any[]): boolean;
    eventNames(): (string | symbol)[];
    listeners(event: string | symbol): ((...args: any[]) => void)[];
    rawListeners(event: string | symbol): ((...args: any[]) => void)[];
    setMaxListeners(count: number): this;
    getMaxListeners(): number;
    listenerCount(event: string | symbol, listener?: (...args: any[]) => void): number;
    collect(callback: (error: Error | null, output?: T) => void): this;
  }
  export function encode(content: string, encoding: string, options?: EncodeOptions | null): ByteBuffer;
  export function decode(buffer: Uint8Array, encoding: string, options?: DecodeOptions | null): string;
  export function encodingExists(encoding: string): boolean;
  export const toEncoding: typeof encode;
  export const fromEncoding: typeof decode;
  export function getEncoder(encoding: string, options?: EncodeOptions | null): EncoderStream;
  export function getDecoder(encoding: string, options?: DecodeOptions | null): DecoderStream;
  export function getCodec(encoding: string): Codec;
  export function encodeStream(encoding: string, options?: StreamOptions | null): ConversionStream<ByteBuffer>;
  export function decodeStream(encoding: string, options?: StreamOptions | null): ConversionStream<string>;
  export const IconvLiteEncoderStream: new (encoder: EncoderStream, options?: StreamOptions | null) => ConversionStream<ByteBuffer>;
  export const IconvLiteDecoderStream: new (decoder: DecoderStream, options?: StreamOptions | null) => ConversionStream<string>;
  export function enableStreamingAPI(streamModule: { Transform: new (...args: any[]) => unknown }): void;
  export function _canonicalizeEncoding(encoding: string): string;
  export let encodings: Record<string, string | Record<string, unknown> | (new (...args: any[]) => Codec)> | null;
  export let _codecDataCache: Record<string, Codec>;
  export let defaultCharUnicode: string;
  export let defaultCharSingleByte: string;
  export const supportsStreams: boolean;
}
export = iconv;
