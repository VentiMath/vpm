export {
  Storage,
  IdempotencyStrategy,
  RETRYABLE_ERR_FN_DEFAULT,
} from "./index.js";
export type { StorageOptions, RetryOptions } from "./index.js";
export declare const ExceptionMessages: {
  readonly EXPIRATION_DATE_INVALID: string;
  readonly EXPIRATION_DATE_PAST: string;
};
