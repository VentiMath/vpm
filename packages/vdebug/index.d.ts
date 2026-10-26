import ms = require('vms');

declare const createDebug: createDebug.Debug;
declare namespace createDebug {
  interface Debug {
    (namespace: string): Debugger;
    readonly debug: Debug;
    readonly default: Debug;
    readonly humanize: typeof ms;
    readonly names: readonly string[];
    readonly skips: readonly string[];
    readonly namespaces: string;
    formatters: Record<string, (this: Debugger, value: unknown) => unknown>;
    log: (...args: unknown[]) => unknown;
    colors: Array<number | string>;
    inspectOpts?: Record<string, unknown>;
    enable(namespaces?: string): void;
    disable(): string;
    enabled(namespace: string): boolean;
    coerce(value: unknown): unknown;
    selectColor(namespace: string): number | string;
    useColors(): boolean;
    formatArgs(this: Debugger, args: unknown[]): void;
    save(namespaces?: string): void;
    load(): string | undefined;
    destroy(): void;
  }
  interface Debugger {
    (...args: unknown[]): void;
    namespace: string;
    get enabled(): boolean;
    set enabled(value: boolean | null);
    useColors: boolean;
    color: number | string;
    diff?: number;
    prev?: number;
    curr?: number;
    log?: (...args: unknown[]) => unknown;
    inspectOpts?: Record<string, unknown>;
    extend(namespace: string, delimiter?: string): Debugger;
    /** Retained upstream compatibility stub; does not disable this logger. */
    destroy(): void;
  }
}
export = createDebug;
