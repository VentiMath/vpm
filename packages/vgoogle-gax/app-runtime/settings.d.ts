export {
  Status,
  GoogleError,
  RetryOptions,
  createRetryOptions,
  createBackoffSettings,
  createDefaultBackoffSettings,
  CallSettings,
  constructSettings,
} from "./index";
export type {
  BackoffSettings,
  CallOptions,
  ClientConfig,
  ServiceConfig,
} from "./index";
export declare function httpCode(code: number): number;
export declare function camel(name: string): string;
