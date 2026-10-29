/** Structural Node capabilities used by this package's public API. */
export declare class EventEmitter {
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  once(event: string | symbol, listener: (...args: any[]) => void): this;
  addListener(event: string | symbol, listener: (...args: any[]) => void): this;
  removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
  off(event: string | symbol, listener: (...args: any[]) => void): this;
  removeAllListeners(event?: string | symbol): this;
  emit(event: string | symbol, ...args: any[]): boolean;
  listenerCount(event: string | symbol): number;
  listeners(event: string | symbol): Function[];
  setMaxListeners(count: number): this;
  getMaxListeners(): number;
  eventNames(): (string | symbol)[];
}
export interface Readable {
  setEncoding(encoding: string): this;
  on(event: string, listener: (...args: any[]) => void): this;
}
export interface Agent { destroy(): void; }
export interface ParsedUrlQueryInput {
  [key: string]: string | number | boolean | readonly string[] | readonly number[] | readonly boolean[] | null | undefined;
}
