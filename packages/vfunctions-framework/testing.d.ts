import type { Server as ExpressServer, ListenOptions } from 'vexpress';
import type { HandlerFunction } from './index.js';
/** Native HTTP server, expressed structurally without ambient Node types. */
export interface Server extends ExpressServer {
    listen(port?: number, callback?: () => void): this;
    listen(port: number, host: string, callback?: () => void): this;
    listen(port: number, host: string, backlog: number, callback?: () => void): this;
    listen(path: string, callback?: () => void): this;
    listen(options: ListenOptions, callback?: () => void): this;
    setTimeout(milliseconds: number, callback?: () => void): this;
    timeout: number;
    requestTimeout: number;
    headersTimeout: number;
    keepAliveTimeout: number;
}
export function getFunction(functionName: string): HandlerFunction | undefined;
export function getTestServer(functionName: string): Server;
