import type {
  Buffer,
  Readable,
  Writable,
  OutgoingHttpHeaders,
  PipelineSource,
  URL,
} from "./platform.js";
import type { GoogleAuth } from "vgoogle-auth-library";
export {
  CRC32C,
  CRC32C_DEFAULT_VALIDATOR_GENERATOR,
  CRC32C_EXCEPTION_MESSAGES,
  CRC32C_EXTENSIONS,
  CRC32C_EXTENSION_TABLE,
} from "./crc32c.js";
export { HashStreamValidator } from "./hash-stream-validator.js";
export type { CRC32CValidator, CRC32CValidatorGenerator } from "./crc32c.js";
export interface PreconditionOptions {
  ifGenerationMatch?: number | string;
  ifGenerationNotMatch?: number | string;
  ifMetagenerationMatch?: number | string;
  ifMetagenerationNotMatch?: number | string;
}
export interface FileMetadata {
  name?: string;
  bucket?: string;
  generation?: string;
  metageneration?: string;
  size?: string | number;
  contentType?: string;
  contentEncoding?: string;
  cacheControl?: string;
  contentDisposition?: string;
  crc32c?: string;
  md5Hash?: string;
  metadata?: Record<string, string | number | boolean | null>;
  contexts?: { custom?: Record<string, { value: string }> };
  [key: string]: unknown;
}
export type BucketMetadata = Record<string, unknown> & {
  name?: string;
  location?: string;
};
export interface RequestOptions {
  uri?: string;
  url?: string;
  method?: string;
  headers?: OutgoingHttpHeaders;
  qs?: Record<string, unknown>;
  json?: unknown;
  body?: unknown;
  timeout?: number;
  maxRetries?: number;
  [key: string]: unknown;
}
export interface Response {
  statusCode: number;
  statusMessage?: string;
  headers: Record<string, string | string[] | undefined>;
}
export type RequestCallback = (
  error: Error | null,
  body?: any,
  response?: Response,
) => void;
export interface Interceptor {
  request: (options: RequestOptions) => RequestOptions;
}
export enum IdempotencyStrategy {
  RetryAlways = 0,
  RetryConditional = 1,
  RetryNever = 2,
}
export interface RetryOptions {
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelayMultiplier?: number;
  totalTimeout?: number;
  maxRetryDelay?: number;
  idempotencyStrategy?: IdempotencyStrategy;
  retryableErrorFn?: (error: Error) => boolean;
}
export interface StorageOptions {
  projectId?: string;
  keyFilename?: string;
  credentials?: {
    client_email?: string;
    private_key?: string;
    [key: string]: unknown;
  };
  authClient?: GoogleAuth;
  clientOptions?: Record<string, unknown>;
  apiEndpoint?: string;
  emulatorHost?: string;
  universeDomain?: string;
  useAuthWithCustomEndpoint?: boolean;
  retryOptions?: RetryOptions;
  timeout?: number;
  interceptors_?: Interceptor[];
  crc32cGenerator?: import("./crc32c.js").CRC32CValidatorGenerator;
}
export class ApiError extends Error {
  constructor(
    input:
      | string
      | { message?: string; code?: number | string; errors?: unknown[] },
    response?: Response,
  );
  code?: number | string;
  errors: unknown[];
  response?: Response;
}
export function RETRYABLE_ERR_FN_DEFAULT(error: Error): boolean;
export class Storage {
  constructor(options?: StorageOptions);
  projectId: string;
  apiEndpoint: string;
  baseUrl: string;
  customEndpoint: boolean;
  readonly emulatorHost?: string;
  universeDomain: string;
  authClient: GoogleAuth;
  retryOptions: Required<RetryOptions>;
  interceptors: Interceptor[];
  bucket(name: string, options?: BucketOptions): Bucket;
  getProjectId(): Promise<string>;
  getProjectId(callback: (error: Error | null, id?: string) => void): void;
  createBucket(
    name: string,
    options?: BucketMetadata,
  ): Promise<[Bucket, BucketMetadata]>;
  createBucket(
    name: string,
    callback: (
      error: Error | null,
      bucket?: Bucket,
      metadata?: BucketMetadata,
    ) => void,
  ): void;
  createBucket(
    name: string,
    options: BucketMetadata,
    callback: (
      error: Error | null,
      bucket?: Bucket,
      metadata?: BucketMetadata,
    ) => void,
  ): void;
  makeAuthenticatedRequest(
    options: RequestOptions,
    callback: RequestCallback,
  ): void;
  request(options: RequestOptions, callback: RequestCallback): void;
}
export interface BucketOptions {
  userProject?: string;
  preconditionOpts?: PreconditionOptions;
}
export interface FileOptions extends BucketOptions {
  generation?: number | string;
  encryptionKey?: string | Uint8Array;
  kmsKeyName?: string;
  crc32cGenerator?: import("./crc32c.js").CRC32CValidatorGenerator;
}
export interface GetFilesOptions {
  prefix?: string;
  delimiter?: string;
  pageToken?: string;
  maxResults?: number;
  maxApiCalls?: number;
  autoPaginate?: boolean;
  versions?: boolean;
  userProject?: string;
  [key: string]: unknown;
}
export type GetFilesResponse = [
  File[],
  GetFilesOptions | null,
  Record<string, unknown>,
];
export interface SaveOptions {
  contentType?: string;
  metadata?: FileMetadata;
  resumable?: boolean;
  validation?: boolean | "crc32c" | "md5";
  gzip?: boolean | "auto";
  preconditionOpts?: PreconditionOptions;
  userProject?: string;
  predefinedAcl?: string;
  public?: boolean;
  private?: boolean;
  timeout?: number;
  onUploadProgress?: (event: {
    bytesWritten: number;
    contentLength: number | string;
  }) => void;
  chunkSize?: number;
  highWaterMark?: number;
  uri?: string;
  offset?: number;
  isPartialUpload?: boolean;
  resumeCRC32C?: string | number;
}
export type CreateWriteStreamOptions = SaveOptions;
export interface UploadOptions extends SaveOptions {
  destination?: string | File;
}
export interface GetSignedUrlConfig {
  action: "read" | "write" | "delete" | "resumable";
  expires: number | string | Date;
  accessibleAt?: number | string | Date;
  version?: "v2" | "v4";
  contentType?: string;
  contentMd5?: string;
  extensionHeaders?: OutgoingHttpHeaders;
  queryParams?: Record<string, string>;
  host?: string | URL;
  signingEndpoint?: string | URL;
  cname?: string;
  virtualHostedStyle?: boolean;
  responseType?: string;
  responseDisposition?: string;
  promptSaveAs?: string;
}
export type GetSignedUrlResponse = [string];
export interface DownloadOptions {
  destination?: string;
  start?: number;
  end?: number;
  validation?: boolean | "crc32c" | "md5";
  decompress?: boolean;
  timeout?: number;
  queryParams?: Record<string, unknown>;
}
export type CreateReadStreamOptions = DownloadOptions;
export interface DeleteFileOptions extends PreconditionOptions {
  ignoreNotFound?: boolean;
  userProject?: string;
}
export interface GenerateSignedPostPolicyV4Options {
  expires: number | string | Date;
  fields?: Record<string, string>;
  conditions?: Array<Record<string, string> | Array<string | number>>;
  signingEndpoint?: string;
  virtualHostedStyle?: boolean;
  bucketBoundHostname?: string;
}
export interface SignedPostPolicyV4Output {
  url: string;
  fields: Record<string, string>;
}
type MetadataCallback<T> = (
  error: Error | null,
  metadata?: T,
  response?: Response,
) => void;
type ExistsCallback = (error: Error | null, exists?: boolean) => void;
type DeleteCallback = (error?: Error | null, response?: Response) => void;
export class Bucket {
  constructor(storage: Storage, name: string, options?: BucketOptions);
  name: string;
  id: string;
  storage: Storage;
  parent: Storage;
  metadata: BucketMetadata;
  userProject?: string;
  interceptors: Interceptor[];
  file(name: string, options?: FileOptions): File;
  getMetadata(
    options?: Record<string, unknown>,
  ): Promise<[BucketMetadata, Response]>;
  getMetadata(callback: MetadataCallback<BucketMetadata>): void;
  getMetadata(
    options: Record<string, unknown>,
    callback: MetadataCallback<BucketMetadata>,
  ): void;
  setMetadata(
    metadata: BucketMetadata,
    options?: PreconditionOptions,
  ): Promise<[BucketMetadata, Response]>;
  setMetadata(
    metadata: BucketMetadata,
    callback: MetadataCallback<BucketMetadata>,
  ): void;
  setMetadata(
    metadata: BucketMetadata,
    options: PreconditionOptions,
    callback: MetadataCallback<BucketMetadata>,
  ): void;
  exists(options?: Record<string, unknown>): Promise<[boolean]>;
  exists(callback: ExistsCallback): void;
  exists(options: Record<string, unknown>, callback: ExistsCallback): void;
  delete(options?: DeleteFileOptions): Promise<[Response?]>;
  delete(callback: DeleteCallback): void;
  delete(options: DeleteFileOptions, callback: DeleteCallback): void;
  create(options?: BucketMetadata): Promise<[Bucket, BucketMetadata]>;
  getFiles(options?: GetFilesOptions): Promise<GetFilesResponse>;
  getFiles(
    callback: (
      error: Error | null,
      files?: File[],
      next?: GetFilesOptions | null,
      response?: Record<string, unknown>,
    ) => void,
  ): void;
  getFiles(
    options: GetFilesOptions,
    callback: (
      error: Error | null,
      files?: File[],
      next?: GetFilesOptions | null,
      response?: Record<string, unknown>,
    ) => void,
  ): void;
  getFilesStream(options?: GetFilesOptions): Readable;
  upload(local: string, options?: UploadOptions): Promise<[File, FileMetadata]>;
  upload(
    local: string,
    callback: (
      error: Error | null,
      file?: File,
      metadata?: FileMetadata,
    ) => void,
  ): void;
  upload(
    local: string,
    options: UploadOptions,
    callback: (
      error: Error | null,
      file?: File,
      metadata?: FileMetadata,
    ) => void,
  ): void;
}
export class File {
  constructor(bucket: Bucket, name: string, options?: FileOptions);
  name: string;
  id: string;
  bucket: Bucket;
  parent: Bucket;
  storage: Storage;
  metadata: FileMetadata;
  generation?: number | string;
  userProject?: string;
  interceptors: Interceptor[];
  save(
    data: string | Uint8Array | PipelineSource<Uint8Array>,
    options?: SaveOptions,
  ): Promise<void>;
  save(
    data: string | Uint8Array | PipelineSource<Uint8Array>,
    callback: (error?: Error | null) => void,
  ): void;
  save(
    data: string | Uint8Array | PipelineSource<Uint8Array>,
    options: SaveOptions,
    callback: (error?: Error | null) => void,
  ): void;
  createWriteStream(options?: SaveOptions): Writable;
  createResumableUpload(options?: SaveOptions): Promise<[string]>;
  createResumableUpload(
    callback: (error: Error | null, uri?: string) => void,
  ): void;
  createResumableUpload(
    options: SaveOptions,
    callback: (error: Error | null, uri?: string) => void,
  ): void;
  getMetadata(
    options?: Record<string, unknown>,
  ): Promise<[FileMetadata, Response]>;
  getMetadata(callback: MetadataCallback<FileMetadata>): void;
  getMetadata(
    options: Record<string, unknown>,
    callback: MetadataCallback<FileMetadata>,
  ): void;
  setMetadata(
    metadata: FileMetadata,
    options?: PreconditionOptions,
  ): Promise<[FileMetadata, Response]>;
  setMetadata(
    metadata: FileMetadata,
    callback: MetadataCallback<FileMetadata>,
  ): void;
  setMetadata(
    metadata: FileMetadata,
    options: PreconditionOptions,
    callback: MetadataCallback<FileMetadata>,
  ): void;
  exists(options?: Record<string, unknown>): Promise<[boolean]>;
  exists(callback: ExistsCallback): void;
  exists(options: Record<string, unknown>, callback: ExistsCallback): void;
  delete(options?: DeleteFileOptions): Promise<[Response?]>;
  delete(callback: DeleteCallback): void;
  delete(options: DeleteFileOptions, callback: DeleteCallback): void;
  getSignedUrl(config: GetSignedUrlConfig): Promise<[string]>;
  getSignedUrl(
    config: GetSignedUrlConfig,
    callback: (error: Error | null, url?: string) => void,
  ): void;
  generateSignedPostPolicyV4(
    options: GenerateSignedPostPolicyV4Options,
  ): Promise<[SignedPostPolicyV4Output]>;
  generateSignedPostPolicyV4(
    options: GenerateSignedPostPolicyV4Options,
    callback: (error: Error | null, output?: SignedPostPolicyV4Output) => void,
  ): void;
  setEncryptionKey(key: string | Uint8Array | null): this;
  createReadStream(options?: DownloadOptions): Readable;
  download(options: DownloadOptions & { destination: string }): Promise<[]>;
  download(
    options?: DownloadOptions & { destination?: undefined },
  ): Promise<[Buffer]>;
  download(options: DownloadOptions): Promise<[Buffer] | []>;
  download(callback: (error: Error | null, data?: Buffer) => void): void;
  download(
    options: DownloadOptions,
    callback: (error: Error | null, data?: Buffer) => void,
  ): void;
  publicUrl(): string;
  request(options: RequestOptions, callback: RequestCallback): void;
}
