declare class EventEmitter {
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  once(event: string | symbol, listener: (...args: any[]) => void): this;
  addListener(event: string | symbol, listener: (...args: any[]) => void): this;
  prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
  prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
  removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
  off(event: string | symbol, listener: (...args: any[]) => void): this;
  removeAllListeners(event?: string | symbol): this;
  emit(event: string | symbol, ...args: any[]): boolean;
  eventNames(): Array<string | symbol>;
  listeners(event: string | symbol): Function[];
  rawListeners(event: string | symbol): Function[];
  listenerCount(event: string | symbol, listener?: Function): number;
  getMaxListeners(): number;
  setMaxListeners(value: number): this;
}

export declare enum LogSeverity {
    DEFAULT = "DEFAULT",
    DEBUG = "DEBUG",
    INFO = "INFO",
    WARNING = "WARNING",
    ERROR = "ERROR"
}
export interface LogFields {
    severity?: LogSeverity;
    telemetryTraceId?: string;
    telemetrySpanId?: string;
    other?: unknown;
}
export declare interface AdhocDebugLogger {
    on(event: 'log', listener: (fields: LogFields, args: unknown[]) => void): this;
    on(event: string, listener: Function): this;
}
export declare class AdhocDebugLogger extends EventEmitter {
    namespace: string;
    upstream: AdhocDebugLogCallable;
    func: AdhocDebugLogFunction;
    constructor(namespace: string, upstream?: AdhocDebugLogCallable);
    invoke(fields: LogFields, ...args: unknown[]): void;
    invokeSeverity(severity: LogSeverity, ...args: unknown[]): void;
}
export declare const placeholder: AdhocDebugLogFunction;
export interface AdhocDebugLogCallable {
    (fields: LogFields, ...args: unknown[]): void;
}
export interface AdhocDebugLogFunction extends AdhocDebugLogCallable {
    instance: AdhocDebugLogger;
    on(event: 'log', listener: (fields: LogFields, args: unknown[]) => void): this;
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
    sublog(namespace: string): AdhocDebugLogFunction;
}
export interface DebugLogBackend {
    log(namespace: string, fields: LogFields, ...args: unknown[]): void;
    setFilters(filters?: readonly string[]): void;
}
export declare abstract class DebugLogBackendBase implements DebugLogBackend {
    cached: Map<string, AdhocDebugLogCallable>;
    filters: readonly string[];
    filtersSet: boolean;
    constructor();
    abstract makeLogger(namespace: string): AdhocDebugLogCallable;
    abstract setFilters(filters?: readonly string[]): void;
    log(namespace: string, fields: LogFields, ...args: unknown[]): void;
}
export declare function getNodeBackend(): DebugLogBackend;
export interface DebugPackage { (namespace: string): (...args: unknown[]) => void; enable(filters: string): void; namespaces?: string; }
export declare function getDebugBackend(debugPkg: DebugPackage): DebugLogBackend;
export declare function getStructuredBackend(upstream?: DebugLogBackend): DebugLogBackend;
export declare const env: {
    readonly nodeEnables: string;
};
export declare function setBackend(backend: DebugLogBackend | null | undefined): void;
export declare function log(namespace: string, parent?: AdhocDebugLogFunction): AdhocDebugLogFunction;
export {};
