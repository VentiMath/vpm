import Negotiator = require('vnegotiator');
declare const Accepts: Accepts.Constructor;
declare namespace Accepts {
  interface Method {
    (): string[];
    (values: readonly []): string[];
    (values: readonly [string, ...string[]]): string | false;
    (values: readonly string[]): string | false | string[];
    (value: string, ...values: string[]): string | false;
  }
  interface Instance {
    readonly headers: Negotiator.Request['headers'];
    negotiator: Negotiator.Instance;
    type: Method;
    types: Method;
    charset: Method;
    charsets: Method;
    encoding: Method;
    encodings: Method;
    language: Method;
    languages: Method;
    lang: Method;
    langs: Method;
  }
  interface Constructor {
    (request: Negotiator.Request): Instance;
    new(request: Negotiator.Request): Instance;
  }
}
export = Accepts;
