// The application's client surface. Wire/server declarations retain their
// upstream provenance; internal channel factories are deliberately not exposed.
import type { Buffer } from "../build/src/platform";
import type { Metadata } from "../build/src/metadata";
import type { CallCredentials } from "../build/src/call-credentials";
import type { ChannelCredentials } from "../build/src/channel-credentials";
import type { ChannelOptions as AllChannelOptions } from "../build/src/channel-options";
import type { ConnectivityState } from "../build/src/connectivity-state";
import type {
  ServiceDefinition,
  ProtobufTypeDefinition,
} from "../build/src/make-client";
import type { PackageDefinition } from "vgrpc-proto-loader";
import type {
  ClientUnaryCall,
  ClientReadableStream,
  ClientWritableStream,
  ClientDuplexStream,
  ServiceError,
} from "../build/src/call";

export * from "../build/src/index.js";
export type ChannelOptions = Pick<
  AllChannelOptions,
  | "grpc.ssl_target_name_override"
  | "grpc.primary_user_agent"
  | "grpc.secondary_user_agent"
  | "grpc.default_authority"
  | "grpc.keepalive_time_ms"
  | "grpc.keepalive_timeout_ms"
  | "grpc.keepalive_permit_without_calls"
  | "grpc.service_config"
  | "grpc.initial_reconnect_backoff_ms"
  | "grpc.max_reconnect_backoff_ms"
  | "grpc.max_send_message_length"
  | "grpc.max_receive_message_length"
  | "grpc.default_compression_algorithm"
  | "grpc.enable_retries"
  | "grpc.per_rpc_retry_buffer_size"
  | "grpc.retry_buffer_size"
  | "grpc-node.max_session_memory"
  | "grpc-node.flow_control_window"
> & {
  "grpc.use_local_subchannel_pool"?: 1;
  "grpc.lb_policy_name"?: "pick_first";
};
export type ClientOptions = ChannelOptions;
export interface CallOptions {
  deadline?: Date | number;
  host?: string;
  credentials?: CallCredentials;
}
export declare class Channel {
  constructor(
    target: string,
    credentials: ChannelCredentials,
    options?: ChannelOptions,
  );
  close(): void;
  getTarget(): string;
  getConnectivityState(connect: boolean): ConnectivityState;
  watchConnectivityState(
    previous: ConnectivityState,
    deadline: Date | number,
    callback: (error?: Error) => void,
  ): void;
}
export type ChannelInterface = Channel;
type Serialize<T> = (value: T) => Buffer;
type Deserialize<T> = (value: Buffer) => T;
export type requestCallback<T> = (
  error: ServiceError | null,
  value?: T,
) => void;
type UnaryArgs<T> =
  | [callback: requestCallback<T>]
  | [options: CallOptions, callback: requestCallback<T>]
  | [metadata: Metadata, callback: requestCallback<T>]
  | [metadata: Metadata, options: CallOptions, callback: requestCallback<T>];
type StreamArgs =
  | []
  | [options: CallOptions]
  | [metadata: Metadata, options?: CallOptions];
export declare class Client {
  constructor(
    target: string,
    credentials: ChannelCredentials,
    options?: ClientOptions,
  );
  close(): void;
  getChannel(): Channel;
  waitForReady(
    deadline: Date | number,
    callback: (error?: Error) => void,
  ): void;
  makeUnaryRequest<I, O>(
    path: string,
    serialize: Serialize<I>,
    deserialize: Deserialize<O>,
    request: I,
    ...args: UnaryArgs<O>
  ): ClientUnaryCall;
  makeServerStreamRequest<I, O>(
    path: string,
    serialize: Serialize<I>,
    deserialize: Deserialize<O>,
    request: I,
    ...args: StreamArgs
  ): ClientReadableStream<O>;
  makeClientStreamRequest<I, O>(
    path: string,
    serialize: Serialize<I>,
    deserialize: Deserialize<O>,
    ...args: UnaryArgs<O>
  ): ClientWritableStream<I>;
  makeBidiStreamRequest<I, O>(
    path: string,
    serialize: Serialize<I>,
    deserialize: Deserialize<O>,
    ...args: StreamArgs
  ): ClientDuplexStream<I, O>;
}
export interface ServiceClientConstructor {
  new (
    target: string,
    credentials: ChannelCredentials,
    options?: ClientOptions,
  ): Client & { [method: string]: Function };
  service: ServiceDefinition;
  serviceName: string;
}
export declare function makeClientConstructor(
  methods: ServiceDefinition,
  serviceName: string,
  options?: {},
): ServiceClientConstructor;
export { makeClientConstructor as makeGenericClientConstructor };
export interface GrpcObject {
  [name: string]:
    | GrpcObject
    | ServiceClientConstructor
    | ProtobufTypeDefinition;
}
export declare function loadPackageDefinition(
  definition: PackageDefinition,
): GrpcObject;
export declare function closeClient(client: Client): void;
export declare function getClientChannel(client: Client): Channel;
export declare function waitForClientReady(
  client: Client,
  deadline: Date | number,
  callback: (error?: Error) => void,
): void;
