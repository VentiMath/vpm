declare const mime: {
  readonly charset: (type: string) => string | false;
  readonly charsets: { readonly lookup: (type: string) => string | false };
  readonly contentType: (typeOrExtension: string) => string | false;
  readonly extension: (type: string) => string | false;
  readonly extensions: { readonly [type: string]: readonly string[] | undefined };
  readonly lookup: (pathOrExtension: string) => string | false;
  readonly types: { readonly [extension: string]: string | undefined };
};
export = mime;
