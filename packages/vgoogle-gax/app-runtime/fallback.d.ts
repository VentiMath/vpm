export * from "./index";
import type {
  ClientOptions,
  ClientConfig,
  CallOptions,
  CallSettings,
} from "./index";
import type { Root, Service } from "vprotobufjs";
export declare class GrpcClient {
  constructor(options?: ClientOptions);
  auth: import("vgoogle-auth-library").GoogleAuth;
  fallback: true;
  loadProtoJSON(json: object, refresh?: boolean): Root;
  loadProto(json: object): Root;
  constructSettings(
    service: string,
    config: ClientConfig,
    overrides: ClientConfig,
    headers: Record<string, string>,
    tracing?: boolean,
  ): Record<string, CallSettings>;
  createStub(
    service: Service,
    options?: ClientOptions,
    customServicePath?: boolean,
  ): Promise<Record<string, any>>;
  static clearProtoCache(): void;
  static protobufFromJSON(json: object, refresh?: boolean): Root;
}
export declare const defaultToObjectOptions: object;
