import type { Duplex } from "../build/src/platform";
import type { Root } from "vprotobufjs";
import type { Metadata, ChannelCredentials } from "vgrpc-js";
export * as grpc from "vgrpc-js";
export * as protobuf from "vprotobufjs";
export * as protobufMinimal from "vprotobufjs/minimal";
export * as serializer from "vproto3-json-serializer";
export * as googleAuthLibrary from "vgoogle-auth-library";
export * as loggingUtils from "vgoogle-logging-utils";
export { GoogleAuth, GoogleAuthOptions } from "vgoogle-auth-library";
export { ChannelCredentials, ServiceError } from "vgrpc-js";
export declare enum Status {
  OK = 0,
  CANCELLED = 1,
  UNKNOWN = 2,
  INVALID_ARGUMENT = 3,
  DEADLINE_EXCEEDED = 4,
  NOT_FOUND = 5,
  ALREADY_EXISTS = 6,
  PERMISSION_DENIED = 7,
  RESOURCE_EXHAUSTED = 8,
  FAILED_PRECONDITION = 9,
  ABORTED = 10,
  OUT_OF_RANGE = 11,
  UNIMPLEMENTED = 12,
  INTERNAL = 13,
  UNAVAILABLE = 14,
  DATA_LOSS = 15,
  UNAUTHENTICATED = 16,
}
export declare class GoogleError extends Error {
  code?: number;
  httpStatusCode?: number;
  metadata?: Metadata;
  statusDetails?: unknown[];
  reason?: string;
  domain?: string;
  errorInfoMetadata?: Record<string, string>;
  static parseHttpError(input: unknown): GoogleError;
  static parseGRPCStatusDetails<T extends Error>(error: T): T;
}
export interface BackoffSettings {
  initialRetryDelayMillis?: number;
  retryDelayMultiplier?: number;
  maxRetryDelayMillis?: number;
  initialRpcTimeoutMillis?: number;
  rpcTimeoutMultiplier?: number;
  maxRpcTimeoutMillis?: number;
  totalTimeoutMillis?: number;
  maxRetries?: number;
}
export declare class RetryOptions {
  constructor(
    retryCodes?: number[] | null,
    backoffSettings?: BackoffSettings | null,
    shouldRetryFn?: (error: GoogleError) => boolean,
    getResumptionRequestFn?: (request: any) => any,
  );
  retryCodes: number[] | null;
  backoffSettings: BackoffSettings | null;
  shouldRetryFn?: (error: GoogleError) => boolean;
  getResumptionRequestFn?: (request: any) => any;
}
export interface CallOptions {
  timeout?: number;
  retry?: Partial<RetryOptions> | null;
  autoPaginate?: boolean;
  maxResults?: number;
  maxRetries?: number;
  otherArgs?: {
    headers?: Record<string, string | string[]>;
    options?: Record<string, unknown>;
    metadataBuilder?: (
      tests?: unknown,
      headers?: Record<string, string | string[]>,
    ) => unknown;
    servicePath?: string;
    port?: number;
    internalMethodName?: string;
  };
  apiName?: string;
  enableTelemetryTracing?: boolean;
  retryRequestOptions?: { retries?: number };
}
export declare class CallSettings implements CallOptions {
  constructor(options?: CallOptions);
  timeout: number;
  retry?: RetryOptions | null;
  autoPaginate: boolean;
  otherArgs: NonNullable<CallOptions["otherArgs"]>;
  merge(options?: CallOptions | null): CallSettings;
}
export declare function createRetryOptions(
  codes?: number[] | null,
  backoff?: BackoffSettings | null,
  shouldRetryFn?: (error: GoogleError) => boolean,
  getResumptionRequestFn?: (request: any) => any,
): RetryOptions;
export declare function createBackoffSettings(
  initialRetryDelayMillis: number,
  retryDelayMultiplier: number,
  maxRetryDelayMillis: number,
  initialRpcTimeoutMillis: number,
  rpcTimeoutMultiplier: number,
  maxRpcTimeoutMillis: number,
  totalTimeoutMillis: number,
): BackoffSettings;
export declare function createDefaultBackoffSettings(): BackoffSettings;
export type ClientConfig = { interfaces?: Record<string, ServiceConfig> };
export interface ServiceConfig {
  methods?: Record<string, Record<string, unknown>>;
  retry_codes?: Record<string, string[]>;
  retry_params?: Record<string, Record<string, number>>;
}
export declare function constructSettings(
  service: string,
  config: ClientConfig,
  overrides?: ClientConfig,
  retryNames?: object,
  otherArgs?: CallOptions["otherArgs"],
  tracing?: boolean,
): Record<string, CallSettings> | null;
export type Callback<Response, Next = undefined, Raw = undefined> = (
  error: GoogleError | null,
  response?: Response,
  next?: Next,
  raw?: Raw,
) => void;
export type APICallback = Callback<any, any, any>;
export type PaginationCallback<Request, Raw, Resource> = Callback<
  Resource[],
  Request | null,
  Raw
>;
export interface CancellablePromise<T> extends Promise<T> {
  cancel(): void;
}
export interface CancellableStream extends Duplex {
  cancel(): void;
}
export type GRPCCall = (...args: any[]) => any;
export interface GaxCall {
  (
    request?: any,
    options?: CallOptions,
    callback?: APICallback,
  ):
    | CancellablePromise<[any, any, any]>
    | CancellableStream
    | void;
}
export declare function createApiCall(
  func: GRPCCall | Promise<GRPCCall>,
  settings?: CallSettings,
  descriptor?: PageDescriptor | StreamDescriptor,
  fallback?: boolean | string,
): GaxCall;
export declare enum StreamType {
  SERVER_STREAMING = 1,
  CLIENT_STREAMING = 2,
  BIDI_STREAMING = 3,
}
export declare class StreamDescriptor {
  constructor(type: StreamType, rest?: boolean, gaxStreamingRetries?: boolean);
  type: StreamType;
  rest: boolean;
  streaming: true;
  gaxStreamingRetries: boolean;
}
export declare class PageDescriptor {
  constructor(requestToken: string, responseToken: string, resource: string);
  requestPageTokenField: string;
  responsePageTokenField: string;
  resourceField: string;
  createStream(
    call: Function,
    request?: object,
    options?: CallOptions,
  ): CancellableStream;
  asyncIterate(
    call: Function,
    request?: object,
    options?: CallOptions,
  ): AsyncIterable<any>;
}
export interface Descriptors {
  page: Record<string, PageDescriptor>;
  stream: Record<string, StreamDescriptor>;
  longrunning?: Record<
    string,
    import("../build/src/longRunningCalls/longRunningDescriptor").LongRunningDescriptor
  >;
  batching?: Record<string, unknown>;
}
export interface ClientOptions {
  auth?: any;
  projectId?: string;
  servicePath?: string;
  apiEndpoint?: string;
  port?: number | string;
  sslCreds?: ChannelCredentials;
  cert?: string;
  key?: string;
  rootCerts?: any;
  grpc?: typeof import("vgrpc-js");
  fallback?: boolean | "rest";
  universeDomain?: string;
  enableTelemetryTracing?: boolean;
  clientConfig?: ClientConfig;
  [option: string]: unknown;
}
export type GrpcClientOptions = ClientOptions;
export declare class GrpcClient {
  constructor(options?: ClientOptions);
  auth: import("vgoogle-auth-library").GoogleAuth;
  grpc: typeof import("vgrpc-js");
  grpcVersion: string;
  fallback: boolean;
  loadProtoJSON(json: object, refresh?: boolean): any;
  metadataBuilder(
    headers?: Record<string, string | string[]>,
  ): (tests?: unknown, extra?: Record<string, string | string[]>) => Metadata;
  constructSettings(
    service: string,
    config: ClientConfig,
    overrides: ClientConfig,
    headers: Record<string, string>,
    tracing?: boolean,
  ): Record<string, CallSettings>;
  createStub<T>(
    Client: new (...args: any[]) => T,
    options?: ClientOptions,
    customServicePath?: boolean,
  ): Promise<T>;
  static defaultOptions(): object;
  static clearProtoCache(): void;
  static createByteLengthFunction(message: {
    encode(value: any): { finish(): Uint8Array };
  }): (value: any) => number;
}
export declare const createByteLengthFunction: typeof GrpcClient.createByteLengthFunction;
export declare function protobufFromJSON(json: object, refresh?: boolean): Root;
export declare class PathTemplate {
  constructor(template: string);
  render(values: Record<string, string | number>): string;
  match(value: string): Record<string, string>;
}
export declare const routingHeader: {
  fromParams(values: Record<string, unknown>): string;
};
export declare class LocationsClient {
  constructor(
    gax: GrpcClient | import("./fallback").GrpcClient,
    options?: ClientOptions,
  );
  auth: import("vgoogle-auth-library").GoogleAuth;
  initialize(): Promise<any>;
  getLocation(
    request: object,
    options?: CallOptions | APICallback,
    callback?: APICallback,
  ): any;
  listLocations(
    request: object,
    options?: CallOptions | APICallback,
    callback?: APICallback,
  ): any;
  listLocationsAsync(
    request: object,
    options?: CallOptions,
  ): AsyncIterable<any>;
  close(): Promise<void>;
}
export declare const version: string;
export declare function makeUUID(): string;
export declare function warn(
  code: string,
  message: string,
  type?: string,
): void;
export interface StaticTraceContext {
  gcpClientService?: string;
  gcpVersion?: string;
  serverAddress?: string;
  serverPort?: number;
}
export declare function checkTracingEnabled(settings?: CallOptions): boolean;
export declare function resolveStaticTraceContext(
  settings?: CallOptions,
): StaticTraceContext;
export declare function clearMetadataCache(): void;
export declare function traceCall<T>(
  dynamic: Record<string, unknown>,
  statics: StaticTraceContext,
  fn: (callback?: APICallback) => T,
  streaming?: boolean,
  callback?: APICallback,
): T;
export * as fallback from "./fallback";
// The unused admin/LRO compatibility surface remains explicitly upstream-derived.
export { OperationsClient } from "../build/src/operationsClient";
export { IamClient } from "../build/src/iamService";
export { LongRunningDescriptor as LongrunningDescriptor } from "../build/src/longRunningCalls/longRunningDescriptor";
export {
  Operation,
  operation,
} from "../build/src/longRunningCalls/longrunning";
export type { LROperation } from "../build/src/clientInterface";
export * as LocationProtos from "../build/protos/locations";
export * as IamProtos from "../build/protos/iam_service";
export * as operationsProtos from "../build/protos/operations";
export declare const lro: typeof import("../build/src/index").lro;
