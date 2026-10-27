declare const Negotiator: Negotiator.Constructor;
declare namespace Negotiator {
  interface Request {
    readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  }
  interface EncodingOptions { readonly preferred?: readonly string[]; }
  interface Instance {
    request: Request;
    mediaType(available?: readonly string[] | null): string | undefined;
    mediaTypes(available?: readonly string[] | null): string[];
    charset(available?: readonly string[] | null): string | undefined;
    charsets(available?: readonly string[] | null): string[];
    encoding(available?: readonly string[] | null, options?: EncodingOptions | null): string | undefined;
    encodings(available?: readonly string[] | null, options?: EncodingOptions | null): string[];
    language(available?: readonly string[] | null): string | undefined;
    languages(available?: readonly string[] | null): string[];
    preferredMediaType: Instance['mediaType'];
    preferredMediaTypes: Instance['mediaTypes'];
    preferredCharset: Instance['charset'];
    preferredCharsets: Instance['charsets'];
    preferredEncoding: Instance['encoding'];
    preferredEncodings: Instance['encodings'];
    preferredLanguage: Instance['language'];
    preferredLanguages: Instance['languages'];
  }
  interface Constructor {
    (request: Request): Instance;
    new(request: Request): Instance;
    readonly Negotiator: Constructor;
  }
}
export = Negotiator;
