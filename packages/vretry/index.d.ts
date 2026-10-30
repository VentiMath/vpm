export interface OperationOptions {
  forever?: boolean;
  unref?: boolean;
  maxRetryTime?: number;
}
export interface Options extends OperationOptions {
  retries?: number | null;
  factor?: number;
  minTimeout?: number;
  maxTimeout?: number;
  randomize?: boolean;
}
export interface TimeoutOptions {
  timeout?: number;
  cb?: (attempt?: number) => void;
}
export class RetryOperation {
  constructor(timeouts: readonly number[], options?: OperationOptions | boolean);
  attempt(fn: (attempt: number) => void, timeoutOptions?: TimeoutOptions): void;
  retry(error?: unknown): boolean;
  stop(): void;
  reset(): void;
  errors(): unknown[];
  attempts(): number;
  mainError(): unknown | null;
  try(fn: (attempt: number) => void, timeoutOptions?: TimeoutOptions): void;
  start(fn: (attempt: number) => void, timeoutOptions?: TimeoutOptions): void;
}
export function operation(options?: Options | readonly number[]): RetryOperation;
export function timeouts(options?: Options | readonly number[]): number[];
export function createTimeout(attempt: number, options?: Options): number;
export function wrap(object: object, options?: Options, methods?: readonly PropertyKey[]): void;
export function wrap(object: object, methods: readonly PropertyKey[]): void;
