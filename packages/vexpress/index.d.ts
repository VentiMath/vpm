import router = require('vrouter');
import bodyParser = require('vbody-parser');
import serveStatic = require('vserve-static');
import send = require('vsend');
import accepts = require('vaccepts');
import rangeParser = require('vrange-parser');
import type { SerializeOptions } from 'vcookie';

/** Create an Express 5-style application backed entirely by VPM packages. */
declare function express(): express.Application;
declare namespace express {
  type NextFunction = router.NextFunction;
  type Path = router.Path;
  type Params = router.Params;
  type Locals = Record<string, any>;
  type Header = send.Header;
  interface RawRequest extends bodyParser.Request {
    socket: { remoteAddress?: string; encrypted?: boolean; destroyed?: boolean };
    httpVersionMajor: number;
  }
  interface Request<P = Params, S = any, B = any, Q = Record<string, any>, L extends Locals = Locals> extends RawRequest {
    app: Application;
    res?: Response<S, L>;
    next: NextFunction;
    params: P;
    body: B;
    readonly query: Q;
    baseUrl: string;
    originalUrl: string;
    route?: router.Route;
    cookies?: Record<string, any>;
    signedCookies?: Record<string, any>;
    secret?: string;
    get(name: 'set-cookie'): string[] | undefined;
    get(name: string): string | undefined;
    header: Request['get'];
    accepts: accepts.Method;
    acceptsCharsets: accepts.Method;
    acceptsEncodings: accepts.Method;
    acceptsLanguages: accepts.Method;
    range(size: number, options?: rangeParser.Options): rangeParser.Ranges | -1 | -2 | undefined;
    is(types: readonly string[]): string | false | null;
    is(...types: string[]): string | false | null;
    readonly protocol: string;
    readonly secure: boolean;
    readonly ip: string | undefined;
    readonly ips: string[];
    readonly subdomains: string[];
    readonly path: string;
    readonly host: string | undefined;
    readonly hostname: string | undefined;
    readonly fresh: boolean;
    readonly stale: boolean;
    readonly xhr: boolean;
  }
  interface CookieOptions extends SerializeOptions {
    /** Milliseconds, as in Express (the cookie serializer uses seconds). */
    maxAge?: number;
    signed?: boolean;
  }
  interface SendFileOptions extends send.SendOptions {
    headers?: Record<string, string | number | readonly string[]>;
  }
  type RenderCallback = (error: Error | null, html?: string) => void;
  type Engine = (path: string, options: Record<string, any>, callback: RenderCallback) => void;
  interface Response<B = any, L extends Locals = Locals> extends send.Response {
    app: Application;
    req: Request;
    locals: L;
    status(code: number): this;
    sendStatus(code: number): this;
    send(body?: B): this;
    json(body?: B): this;
    jsonp(body?: B): this;
    links(links: Record<string, string | readonly string[]>): this;
    sendFile(path: string, callback?: (error?: Error) => void): void;
    sendFile(path: string, options: SendFileOptions, callback?: (error?: Error) => void): void;
    download(path: string, callback?: (error?: Error) => void): void;
    download(path: string, filename: string, callback?: (error?: Error) => void): void;
    download(path: string, options: SendFileOptions, callback?: (error?: Error) => void): void;
    download(path: string, filename: string, options: SendFileOptions, callback?: (error?: Error) => void): void;
    type(type: string): this;
    contentType(type: string): this;
    format(handlers: Record<string, (request: Request, response: this, next: NextFunction) => unknown>): this;
    attachment(filename?: string): this;
    append(field: string, value: string | number | readonly string[]): this;
    set(field: string, value: string | number | readonly string[]): this;
    set(fields: Record<string, string | number | readonly string[]>): this;
    header: Response<B, L>['set'];
    get(field: string): Header;
    clearCookie(name: string, options?: CookieOptions): this;
    cookie(name: string, value: any, options?: CookieOptions): this;
    location(url: string): this;
    redirect(url: string): void;
    redirect(status: number, url: string): void;
    vary(field: string | readonly string[]): this;
    render(view: string, callback?: RenderCallback): void;
    render(view: string, options: Record<string, any>, callback?: RenderCallback): void;
  }
  type RequestHandler<P = Params, S = any, B = any, Q = Record<string, any>, L extends Locals = Locals> =
    (request: Request<P, S, B, Q, L>, response: Response<S, L>, next: NextFunction) => unknown;
  type ErrorRequestHandler<P = Params, S = any, B = any, Q = Record<string, any>, L extends Locals = Locals> =
    (error: any, request: Request<P, S, B, Q, L>, response: Response<S, L>, next: NextFunction) => unknown;
  type HandlerList<P = Params, S = any, B = any, Q = Record<string, any>, L extends Locals = Locals> = RequestHandler<P, S, B, Q, L> | ErrorRequestHandler<P, S, B, Q, L> | HandlerList<P, S, B, Q, L>[];
  interface Register<T> {
    <P = Params, S = any, B = any, Q = Record<string, any>, L extends Locals = Locals>(path: Path, ...handlers: Array<RequestHandler<P, S, B, Q, L> | RequestHandler<P, S, B, Q, L>[]>): T;
    <P = Params, S = any, B = any, Q = Record<string, any>, L extends Locals = Locals>(path: Path, ...handlers: HandlerList<P, S, B, Q, L>[]): T;
  }
  type Methods<T> = { [K in Exclude<router.Method, 'get'>]: Register<T> };
  /** Structural server interface: no ambient Node declarations are required. */
  interface Server extends send.Emitter {
    listening: boolean;
    address(): { port: number; address: string; family: string } | string | null;
    close(callback?: (error?: Error) => void): this;
    closeAllConnections(): void;
    closeIdleConnections(): void;
    ref(): this;
    unref(): this;
  }
  interface ListenOptions { port?: number; host?: string; backlog?: number; path?: string; exclusive?: boolean; ipv6Only?: boolean; reusePort?: boolean; }
  interface Application extends Methods<Application>, send.Emitter {
    (request: RawRequest, response: send.Response, next?: NextFunction): void;
    handle(request: RawRequest, response: send.Response, next?: NextFunction): void;
    get: Register<this> & ((setting: string) => any);
    use(...handlers: Array<RequestHandler | RequestHandler[]>): this;
    use(...handlers: HandlerList[]): this;
    use(path: Path, ...handlers: Array<RequestHandler | RequestHandler[]>): this;
    use(path: Path, ...handlers: HandlerList[]): this;
    route(path: Path): router.Route<Request, Response>;
    param(name: string | string[], handler: router.ParamHandler<Request, Response>): this;
    set(setting: string): any;
    set(setting: string, value: any): this;
    enable(setting: string): this;
    disable(setting: string): this;
    enabled(setting: string): boolean;
    disabled(setting: string): boolean;
    path(): string;
    engine(extension: string, engine: Engine): this;
    render(view: string, callback: RenderCallback): void;
    render(view: string, options: Record<string, any>, callback: RenderCallback): void;
    listen(port: number, callback?: (error?: Error) => void): Server;
    listen(port: number, host: string, callback?: (error?: Error) => void): Server;
    listen(port: number, host: string, backlog: number, callback?: (error?: Error) => void): Server;
    listen(path: string, callback?: (error?: Error) => void): Server;
    listen(options: ListenOptions, callback?: (error?: Error) => void): Server;
    request: Request;
    response: Response;
    router: router.Instance<Request, Response>;
    locals: Locals;
    settings: Record<string, any>;
    cache: Record<string, any>;
    engines: Record<string, Engine>;
    mountpath: Path;
    parent?: Application;
    init(): void;
    defaultConfiguration(): void;
  }
  const application: Application;
  const request: Request;
  const response: Response;
  interface RouterFactory {
    (options?: router.Options): router.Instance<Request, Response>;
    new(options?: router.Options): router.Instance<Request, Response>;
    Route: typeof router.Route;
  }
  const Router: RouterFactory;
  const Route: { new(path: Path): router.Route<Request, Response> };
  function json<R extends bodyParser.Request = Request, S = Response>(options?: bodyParser.JsonOptions<R, S> | null): bodyParser.Middleware<R, S>;
  function raw<R extends bodyParser.Request = Request, S = Response>(options?: bodyParser.Options<R, S> | null): bodyParser.Middleware<R, S>;
  function text<R extends bodyParser.Request = Request, S = Response>(options?: bodyParser.Options<R, S> | null): bodyParser.Middleware<R, S>;
  function urlencoded<R extends bodyParser.Request = Request, S = Response>(options?: bodyParser.UrlencodedOptions<R, S> | null): bodyParser.Middleware<R, S>;
  const static: <R extends send.Response = Response>(root: string, options?: serveStatic.Options<R> | null) => serveStatic.Middleware<R>;
}
export = express;
