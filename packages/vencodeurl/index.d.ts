/**
 * Encode a whole URL string, preserving existing percent escapes.
 * Unpaired UTF-16 surrogates become the encoded replacement character.
 * Input is converted with String(); errors from custom coercion propagate.
 */
declare function encodeUrl(url?: unknown): string;

export = encodeUrl;
