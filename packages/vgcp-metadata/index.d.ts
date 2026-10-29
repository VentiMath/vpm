export declare const BASE_PATH: '/computeMetadata/v1';
export declare const HOST_ADDRESS: 'http://169.254.169.254';
export declare const SECONDARY_HOST_ADDRESS: 'http://metadata.google.internal.';
export declare const HEADER_NAME: 'Metadata-Flavor';
export declare const HEADER_VALUE: 'Google';
export declare const HEADERS: Readonly<{'Metadata-Flavor': 'Google'}>;
export declare const METADATA_SERVER_DETECTION: Readonly<Record<'assume-present' | 'none' | 'bios-only' | 'ping-only', string>>;
export interface Signal { readonly aborted: boolean; addEventListener(type: 'abort', listener: () => void, options?: {once?: boolean}): void; removeEventListener(type: 'abort', listener: () => void): void; }
export interface Options {
  params?: Record<string, string>;
  property?: string;
  headers?: Record<string, string | number | readonly string[] | undefined>;
  /** Total network budget, including retries. Default 3000 ms; range 1..3600000. */
  timeout?: number;
  signal?: Signal;
  /** Maximum response bytes. Default 16 MiB; maximum 64 MiB. */
  maxContentLength?: number;
}
export interface MetadataAccessor extends Omit<Options, 'property'> {
  metadataKey: string;
  /** 0..10; default 3. Applies to no-response retries; retryable HTTP responses allow 3 retries. */
  noResponseRetries?: number;
  fastFail?: boolean;
}
export type BulkResults<T extends readonly MetadataAccessor[]> = {[K in T[number]['metadataKey']]: any};
export declare function instance<T = any>(options?: string | Options): Promise<T>;
export declare function project<T = any>(options?: string | Options): Promise<T>;
export declare function universe<T = any>(options?: string | Options): Promise<T>;
export declare function bulk<T extends readonly MetadataAccessor[]>(properties: T): Promise<BulkResults<T>>;
export declare function isAvailable(): Promise<boolean>;
export declare function resetIsAvailableCache(): void;
export declare let gcpResidencyCache: boolean | null;
export declare function getGCPResidency(): boolean;
export declare function setGCPResidency(value?: boolean | null): void;
export declare function requestTimeout(): number;
export declare const GCE_LINUX_BIOS_PATHS: Readonly<{BIOS_DATE: string; BIOS_VENDOR: string}>;
export declare function isGoogleCloudServerless(): boolean;
export declare function isGoogleComputeEngineLinux(): boolean;
export declare function isGoogleComputeEngineMACAddress(): boolean;
export declare function isGoogleComputeEngine(): boolean;
export declare function detectGCPResidency(): boolean;
