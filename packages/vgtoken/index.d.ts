import type {GaxiosOptions, GaxiosPromise} from 'vgaxios';
export interface Transporter { request<T = unknown>(opts: GaxiosOptions): GaxiosPromise<T>; }
export type GetTokenCallback = (error: Error | null, token?: TokenData) => void;
export interface Credentials { privateKey: string; clientEmail?: string; }
export interface TokenData { readonly refresh_token?: string; readonly expires_in?: number; readonly access_token?: string; readonly token_type?: string; readonly id_token?: string; readonly scope?: string; }
export interface AbortSignalLike { readonly aborted: boolean; addEventListener(type: 'abort', listener: () => void, options?: {once?: boolean}): void; removeEventListener(type: 'abort', listener: () => void): void; }
export interface GetTokenOptions { forceRefresh?: boolean; signal?: AbortSignalLike; }
export interface TokenOptions { keyFile?: string; key?: string; email?: string; iss?: string; sub?: string; scope?: string | string[]; additionalClaims?: Record<string, unknown>; eagerRefreshThresholdMillis?: number; transporter?: Transporter; timeout?: number; maxResponseSize?: number; }
export declare class TokenError extends Error { readonly code: string; readonly status?: number; constructor(code: string, message: string, status?: number); }
export declare class GoogleToken {
  constructor(options?: TokenOptions);
  expiresAt?: number; key?: string; keyFile?: string; iss?: string; sub?: string; scope?: string; rawToken?: TokenData; tokenExpires?: number; email?: string;
  additionalClaims?: Readonly<Record<string, unknown>>; eagerRefreshThresholdMillis: number; transporter: Transporter; timeout: number; maxResponseSize: number;
  readonly accessToken?: string; readonly idToken?: string; readonly tokenType?: string; readonly refreshToken?: string;
  hasExpired(): boolean; isTokenExpiring(): boolean;
  getToken(options?: GetTokenOptions): Promise<TokenData>;
  getToken(callback: GetTokenCallback, options?: GetTokenOptions): void;
  revokeToken(): Promise<void>; revokeToken(callback: (error?: Error) => void): void;
  getCredentials(keyFile: string): Promise<Credentials>;
}
