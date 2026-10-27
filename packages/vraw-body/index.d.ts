import type iconv = require('viconv-lite');

declare function getRawBody(stream: getRawBody.ReadableStream, options?: getRawBody.BufferOptions | null): Promise<getRawBody.ByteBuffer>;
declare function getRawBody(stream: getRawBody.ReadableStream, options: string | true | getRawBody.TextOptions): Promise<string>;
declare function getRawBody(stream: getRawBody.ReadableStream, options: getRawBody.Options | string | true | null | undefined): Promise<getRawBody.ByteBuffer | string>;
declare function getRawBody(stream: getRawBody.ReadableStream, callback: getRawBody.Callback<getRawBody.ByteBuffer>): void;
declare function getRawBody(stream: getRawBody.ReadableStream, options: getRawBody.BufferOptions | null | undefined, callback: getRawBody.Callback<getRawBody.ByteBuffer>): void;
declare function getRawBody(stream: getRawBody.ReadableStream, options: string | true | getRawBody.TextOptions, callback: getRawBody.Callback<string>): void;
declare function getRawBody(stream: getRawBody.ReadableStream, options: getRawBody.Options | string | true | null | undefined, callback: getRawBody.Callback<getRawBody.ByteBuffer | string>): void;

declare namespace getRawBody {
  type ByteBuffer = iconv.ByteBuffer;
  /** Node readable-stream surface; no ambient Node or DOM declarations needed. */
  interface ReadableStream {
    on(event: string, listener: (...args: any[]) => void): unknown;
    removeListener(event: string, listener: (...args: any[]) => void): unknown;
    pause(): unknown;
    unpipe(): unknown;
    readonly readable?: boolean;
    readonly destroyed?: boolean;
    readonly readableEnded?: boolean;
    readonly readableEncoding?: string | null;
  }
  interface Options {
    /** Nonnegative safe integer bytes, or a decimal digit string. */
    length?: number | string | null;
    /** A nonnegative integer byte count or vbytes size string. Omit for no limit. */
    limit?: number | string | null;
    /** true means UTF-8; false, null, or omission returns a Buffer. */
    encoding?: string | boolean | null;
  }
  interface BufferOptions extends Options { encoding?: false | null; }
  interface TextOptions extends Options { encoding: string | true; }
  /** Stream/decoder errors are passed through and may lack HTTP metadata. */
  interface RawBodyError extends Error {
    status?: number;
    statusCode?: number;
    expose?: boolean;
    type?: string;
    code?: string;
    encoding?: string;
    limit?: number;
    length?: number | null;
    expected?: number | null;
    received?: number;
  }
  type Callback<T> = (...result: [error: null, body: T] | [error: RawBodyError, body: undefined]) => void;
}
export = getRawBody;
