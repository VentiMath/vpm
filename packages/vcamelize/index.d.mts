/** Convert a string or recursively convert own object keys; nested string values stay unchanged. */
declare function camelize(value: string): string;
declare function camelize(value: null): null;
declare function camelize(value: undefined): undefined;
declare function camelize(value: number): number;
declare function camelize(value: boolean): boolean;
declare function camelize(value: bigint): bigint;
declare function camelize(value: symbol): symbol;
declare function camelize<T extends Date | RegExp | ((...args: any[]) => any)>(value: T): T;
declare function camelize(value: readonly unknown[]): unknown[];
declare function camelize(value: object): Record<string, unknown>;
declare function camelize(value: unknown): unknown;
export default camelize;
