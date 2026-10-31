/**
 * Node platform types, declared structurally so consumers need no ambient Node
 * types. Where Node types are loaded, Buffer is Node's Buffer.
 */
export type Buffer = typeof globalThis extends {Buffer: {alloc(size: number): infer B}} ? B : Uint8Array;
/** An `http.Agent` or `https.Agent`: the members those classes share, so Node's agents satisfy it. */
export interface Agent {
    maxFreeSockets: number;
    maxSockets: number;
    maxTotalSockets: number;
    destroy(): void;
}
export interface EventEmitter {
    on(eventName: string | symbol, listener: (...args: any[]) => void): this;
    once(eventName: string | symbol, listener: (...args: any[]) => void): this;
    emit(eventName: string | symbol, ...args: any[]): boolean;
}
