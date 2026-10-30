import type {Options as RetryOptions} from 'vretry';
declare function retry<Result>(task: (bail: (error?: unknown) => void, attempt: number) => Result | PromiseLike<Result>, options?: retry.Options): Promise<Result>;
declare namespace retry {
  interface Options extends RetryOptions {
    onRetry?: (error: unknown, attempt: number) => void | PromiseLike<void>;
  }
}
export = retry;
