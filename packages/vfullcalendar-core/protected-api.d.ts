// Open interfaces are the connector's declaration-augmentation boundary.
export interface BaseOptions {}
export interface BaseOptionsRefined {}
export interface EventSourceOptions {}
export interface EventSourceOptionsRefined {}
export interface EventRefiners {}
export type Identity<T = any> = (value: T) => T;
export type GenericRefiners = Record<string, (value: any, name: string) => any>;
type RawValue<F> = F extends (value: infer Input, name: string) => infer Output
  ? any extends Input ? Output : Input : never;
export type RawOptionsFromRefiners<R extends GenericRefiners> = {[K in keyof R]?: RawValue<R[K]>};
export type RefinedOptionsFromRefiners<R extends GenericRefiners> = {[K in keyof R]?: ReturnType<R[K]>};

// Use the platform declaration when present, while allowing DOM-free consumers.
export type FetchResponse = typeof globalThis extends {Response: {prototype: infer R}} ? R : {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly url: string;
  json(): Promise<any>;
  text(): Promise<string>;
};
export class JsonRequestError extends Error {
  constructor(message: string, response: FetchResponse);
  response: FetchResponse;
}
export function identity<T>(value: T): T;
export function requestJson<T>(method: string, url: string, parameters: Record<string, any>): Promise<[T, FetchResponse]>;
