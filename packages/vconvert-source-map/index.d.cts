export interface CommentOptions {
  encoding?: "base64" | "uri";
  multiline?: boolean;
}
export interface Converter<T extends object = Record<string, unknown>> {
  sourcemap: T;
  toObject(): T;
  toJSON(space?: number | string): string;
  toURI(): string;
  toBase64(): string;
  toComment(options?: CommentOptions): string;
  getProperty<K extends keyof T>(key: K): T[K];
  getProperty(key: string): unknown;
  setProperty(key: string, value: unknown): this;
  addProperty(key: string, value: unknown): this;
}
export const commentRegex: RegExp, mapFileCommentRegex: RegExp;
export function fromObject<T extends object>(map: T): Converter<T>;
export function fromJSON(data: string | Uint8Array): Converter;
export function fromBase64(data: string): Converter;
export function fromURI(uri: string): Converter;
export function fromComment(comment: string): Converter;
export function fromSource(source: string): Converter | null;
type Data = string | Uint8Array;
type ReadResult<T> =
  T extends PromiseLike<Data> ? Promise<Converter> : Converter;
export function fromMapFileComment<T extends Data | PromiseLike<Data>>(
  comment: string,
  reader: (name: string) => T,
): ReadResult<T>;
export function fromMapFileSource<T extends Data | PromiseLike<Data>>(
  source: string,
  reader: (name: string) => T,
): ReadResult<T> | null;
export function removeComments(source: string): string;
export function removeMapFileComments(source: string): string;
export function generateMapFileComment(
  filename: string,
  options?: { multiline?: boolean },
): string;
