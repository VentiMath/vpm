/** Callable Express 5-style router; supports construction with or without new. */
declare const Router: Router.Factory;
declare namespace Router {
  type Params = Record<string, string | string[] | undefined>;
  type Path = string | RegExp | Array<string | RegExp>;
  type NextFunction = (error?: unknown) => void;
  interface Request {
    method?: string;
    url?: string;
    originalUrl?: string;
    baseUrl?: string;
    params?: Params;
    next?: NextFunction;
  }
  interface Response {
    setHeader(name: string, value: string | number | readonly string[]): unknown;
    end(body?: string): unknown;
  }
  interface Options {
    caseSensitive?: boolean;
    strict?: boolean;
    mergeParams?: boolean;
  }
  type RoutedRequest<Q extends Request> = Q & {
    params: Params;
    baseUrl: string;
    originalUrl?: string;
    route?: Route;
    next?: NextFunction;
  };
  type Handler<Q extends Request = Request, S extends Response = Response> =
    (request: RoutedRequest<Q>, response: S, next: NextFunction) => unknown;
  type ErrorHandler<Q extends Request = Request, S extends Response = Response> =
    (error: unknown, request: RoutedRequest<Q>, response: S, next: NextFunction) => unknown;
  type HandlerInput<Q extends Request, S extends Response> = Handler<Q, S> | ErrorHandler<Q, S> | HandlerInput<Q, S>[];
  type HandlerList<Q extends Request, S extends Response> = Handler<Q, S> | HandlerList<Q, S>[];
  type ParamHandler<Q extends Request = Request, S extends Response = Response> =
    (request: RoutedRequest<Q>, response: S, next: NextFunction, value: string | string[], name: string) => unknown;
  type Method = 'acl' | 'bind' | 'checkout' | 'connect' | 'copy' | 'delete' | 'get' | 'head' |
    'link' | 'lock' | 'm-search' | 'merge' | 'mkactivity' | 'mkcalendar' | 'mkcol' | 'move' |
    'notify' | 'options' | 'patch' | 'post' | 'propfind' | 'proppatch' | 'purge' | 'put' |
    'query' | 'rebind' | 'report' | 'search' | 'source' | 'subscribe' | 'trace' | 'unbind' |
    'unlink' | 'unlock' | 'unsubscribe' | 'all';
  interface Register<Q extends Request, S extends Response, T> {
    (path: Path, ...handlers: HandlerList<Q, S>[]): T;
    (path: Path, ...handlers: HandlerInput<Q, S>[]): T;
  }
  interface RegisterHandlers<Q extends Request, S extends Response, T> {
    (...handlers: HandlerList<Q, S>[]): T;
    (...handlers: HandlerInput<Q, S>[]): T;
  }
  type Methods<Q extends Request, S extends Response, T> = { [K in Method]: Register<Q, S, T> };
  type RouteMethods<Q extends Request, S extends Response, T> = { [K in Method]: RegisterHandlers<Q, S, T> };
  interface Layer<Q extends Request = Request, S extends Response = Response> {
    handle: Handler<Q, S> | ErrorHandler<Q, S>;
    name: string;
    keys: string[];
    params?: Params;
    path?: string;
    method?: string;
    route?: Route<Q, S>;
  }
  interface Instance<Q extends Request = Request, S extends Response = Response> extends Methods<Q, S, Instance<Q, S>> {
    (request: Q, response: S, next: NextFunction): void;
    handle(request: Q, response: S, next: NextFunction): void;
    use: Register<Q, S, this> & RegisterHandlers<Q, S, this>;
    param(name: string, handler: ParamHandler<Q, S>): this;
    route(path: Path): Route<Q, S>;
    caseSensitive?: boolean;
    strict?: boolean;
    mergeParams?: boolean;
    params: Record<string, ParamHandler<Q, S>[]>;
    stack: Layer<Q, S>[];
  }
  interface Route<Q extends Request = Request, S extends Response = Response> extends RouteMethods<Q, S, Route<Q, S>> {
    path: Path;
    stack: Layer<Q, S>[];
    methods: Record<string, boolean>;
    dispatch(request: Q, response: S, done: NextFunction): void;
  }
  interface RouteConstructor {
    new <Q extends Request = Request, S extends Response = Response>(path: Path): Route<Q, S>;
  }
  interface Factory {
    <Q extends Request = Request, S extends Response = Response>(options?: Options): Instance<Q, S>;
    new <Q extends Request = Request, S extends Response = Response>(options?: Options): Instance<Q, S>;
    Route: RouteConstructor;
    prototype: Instance;
  }
}
export = Router;
