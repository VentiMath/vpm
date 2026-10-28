/** Parsed cookies use a fresh null-prototype map. Names are case-sensitive. */
export type Cookies = Record<string, string | undefined>;
export interface ParseOptions {
  /** Modern APIs propagate custom errors; legacy parse() preserves the raw value. */
  decode?: (value: string) => string | undefined;
}
export interface StringifyOptions {
  encode?: (value: string) => string;
}
export interface CookieAttributes {
  /** Safe integer seconds. Legacy serialize() also floors finite fractions. */
  maxAge?: number;
  domain?: string;
  path?: string;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  partitioned?: boolean;
  priority?: 'low' | 'medium' | 'high';
  sameSite?: boolean | 'lax' | 'strict' | 'none';
}
export interface SetCookie extends CookieAttributes {
  name: string;
  value: string | undefined;
}
export interface SerializeOptions extends CookieAttributes, StringifyOptions {}
/** Legacy 0.7 API: strips paired quotes and retains the first occurrence. */
export function parse(header: string, options?: ParseOptions | null): Cookies;
/** Legacy 0.7 API: encodeURIComponent and the original strict character rules. */
export function serialize(name: string, value: string, options?: SerializeOptions | null): string;
/** Modern API: keeps quotes; an undefined decoder result permits a later retry. */
export function parseCookie(header: string, options?: ParseOptions | null): Cookies;
export function stringifyCookie(cookies: Cookies, options?: StringifyOptions | null): string;
/** Parse one Set-Cookie field. Pass multiple response fields separately. */
export function parseSetCookie(header: string, options?: ParseOptions | null): SetCookie;
export function stringifySetCookie(cookie: CookieAttributes & { name: string; value?: string | null }, options?: StringifyOptions | null): string;
