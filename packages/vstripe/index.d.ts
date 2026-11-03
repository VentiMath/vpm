declare class StripeError extends Error {
  readonly type: string;
  readonly statusCode?: number;
  readonly requestId?: string;
  readonly code?: string;
  readonly param?: string;
  readonly decline_code?: string;
  readonly raw?: Record<string, unknown>;
}
export interface StripeConfig {
  apiVersion?: string; host?: string; port?: number | string; protocol?: 'https' | 'http';
  timeout?: number; maxNetworkRetries?: number; stripeAccount?: string; maxResponseBytes?: number;
  /** Native fetch, or an explicitly injected compatible transport. */
  fetch?: (url: string, init: any) => Promise<any>;
}
export interface RequestOptions {
  apiVersion?: string; idempotencyKey?: string; timeout?: number; maxNetworkRetries?: number; stripeAccount?: string;
  /** An AbortSignal from this runtime. */
  signal?: { readonly aborted: boolean; readonly reason: unknown; addEventListener: Function; removeEventListener: Function };
}
export interface SessionCreateParams {
  mode: 'payment' | 'subscription' | 'setup';
  payment_method_types?: string[];
  line_items?: Array<{price?: string; price_data?: {currency: string; product?: string; product_data?: {name: string; description?: string}; unit_amount?: number; unit_amount_decimal?: string; recurring?: {interval: 'day' | 'week' | 'month' | 'year'; interval_count?: number}}; quantity?: number}>;
  success_url?: string; cancel_url?: string; metadata?: Record<string, string>;
  customer?: string; customer_email?: string; client_reference_id?: string;
  /** Other current Checkout parameters are recursively form encoded. */
  [parameter: string]: unknown;
}
export interface Session {
  id: string; object: 'checkout.session'; url: string | null;
  payment_intent: string | {id: string; [field: string]: unknown} | null;
  metadata: Record<string, string> | null; amount_total: number | null; currency: string | null;
  [field: string]: unknown;
}
export interface StripeEvent<T = Session> {
  id: string; object: 'event'; type: string; data: {object: T; previous_attributes?: Record<string, unknown>};
  [field: string]: unknown;
}
export interface LastResponse {requestId?: string; statusCode: number; headers: Record<string, string>; idempotencyKey: string}
export type RawBody = string | Uint8Array;
export interface Webhooks {
  readonly DEFAULT_TOLERANCE: 300;
  constructEvent<T = Session>(payload: RawBody, signature: string, secret: string, tolerance?: number, cryptoProvider?: undefined, receivedAt?: number): StripeEvent<T>;
  constructEventAsync<T = Session>(payload: RawBody, signature: string, secret: string, tolerance?: number, cryptoProvider?: undefined, receivedAt?: number): Promise<StripeEvent<T>>;
  generateTestHeaderString(options: {payload: RawBody; secret: string; timestamp?: number; scheme?: string; signature?: string}): string;
  generateTestHeaderStringAsync(options: {payload: RawBody; secret: string; timestamp?: number; scheme?: string; signature?: string}): Promise<string>;
  signature: { verifyHeader(payload: RawBody, signature: string, secret: string, tolerance?: number, cryptoProvider?: undefined, receivedAt?: number): boolean; verifyHeaderAsync(payload: RawBody, signature: string, secret: string, tolerance?: number, cryptoProvider?: undefined, receivedAt?: number): Promise<boolean> };
}
export declare class Stripe {
  constructor(apiKey: string, config?: StripeConfig);
  static readonly API_VERSION: string;
  static readonly webhooks: Webhooks;
  static readonly errors: Record<'StripeError' | 'StripeAPIError' | 'StripeInvalidRequestError' | 'StripeAuthenticationError' | 'StripePermissionError' | 'StripeRateLimitError' | 'StripeCardError' | 'StripeIdempotencyError' | 'StripeConnectionError' | 'StripeSignatureVerificationError', new (...args: any[]) => StripeError>;
  readonly webhooks: Webhooks;
  readonly checkout: {sessions: {create(params: SessionCreateParams, options?: RequestOptions): Promise<Session & {lastResponse: LastResponse}>}};
}
export default Stripe;
