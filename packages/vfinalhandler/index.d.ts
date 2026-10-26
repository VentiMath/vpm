import onFinished = require('von-finished');

/** Create a terminal HTTP error/404 callback. The first accepted call wins. */
declare function finalhandler<Req extends finalhandler.Request, Res extends finalhandler.Response>(
  request: Req,
  response: Res,
  options?: finalhandler.Options<Req, Res> | null,
): (error?: unknown) => void;

declare namespace finalhandler {
  interface Request extends onFinished.Message {
    url?: string;
    originalUrl?: unknown;
    method?: string;
    httpVersionMajor: number;
    aborted?: boolean;
    socket: (onFinished.Socket & { destroyed?: boolean; destroy(): unknown }) | null;
    unpipe(): unknown;
    resume(): unknown;
  }

  interface Response {
    statusCode: number;
    statusMessage: string;
    readonly headersSent: boolean;
    readonly writableEnded?: boolean;
    readonly destroyed?: boolean;
    removeHeader(name: string): unknown;
    setHeader(name: string, value: number | string | readonly string[]): unknown;
    end(): unknown;
    end(body: string, encoding: 'utf8'): unknown;
  }

  interface Options<Req = Request, Res = Response> {
    /** Defaults to NODE_ENV, then development. Production hides error details. */
    env?: string;
    /** Scheduled with setImmediate for the first accepted error, even after headers. */
    onerror?: ((error: unknown, request: Req, response: Res) => void) | null;
  }
}

export = finalhandler;
