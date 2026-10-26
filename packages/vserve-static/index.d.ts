import send = require('vsend');

/** Serve files beneath root as Connect/Express middleware. */
declare function serveStatic<R extends send.Response = send.Response>(root: string, options?: serveStatic.Options<R> | null): serveStatic.Middleware<R>;
declare namespace serveStatic {
  interface Request extends send.Request {
    url?: string;
    originalUrl?: unknown;
  }
  interface Options<R extends send.Response = send.Response> extends Omit<send.SendOptions, 'root'> {
    fallthrough?: boolean;
    redirect?: boolean;
    /** Synchronous header callback; this is the active sender. */
    setHeaders?: (this: send.SendStream, response: R, path: string, stat: send.Stats) => void;
  }
  type NextFunction = (error?: unknown) => void;
  type Middleware<R extends send.Response = send.Response> = (request: Request, response: R, next: NextFunction) => void;
}
export = serveStatic;
