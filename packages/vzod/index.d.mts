export interface ZodIssue {
  code: string;
  path: (string | number)[];
  message: string;
  [detail: string]: any;
}
export interface ErrorContext extends Partial<ZodIssue> {
  code: string;
  input: unknown;
  inst: ZodTypeAny;
  schema: ZodTypeAny;
}
export type ErrorMap = (
  issue: ErrorContext,
) => string | { message: string } | undefined;
export type ErrorOptions =
  | string
  | {
      error?: string | ErrorMap;
      message?: string;
      required_error?: string;
      invalid_type_error?: string;
    };
export interface ParseOptions {
  error?: ErrorMap;
  reportInput?: boolean;
}
export interface RefinementContext {
  addIssue(
    issue:
      | string
      | (Partial<ZodIssue> & {
          message?: string;
          fatal?: boolean;
          continue?: boolean;
        }),
  ): void;
}
export type SafeParseReturn<O> =
  | { success: true; data: O }
  | { success: false; error: ZodError<O> };
export declare class ZodError<T = unknown> extends Error {
  issues: ZodIssue[];
  readonly errors: ZodIssue[];
  constructor(issues: ZodIssue[]);
  flatten<U = string>(
    map?: (issue: ZodIssue) => U,
  ): { formErrors: U[]; fieldErrors: Record<string, U[]> };
  format<U = string>(
    map?: (issue: ZodIssue) => U,
  ): { _errors: U[]; [key: string]: any };
}
export declare abstract class ZodType<O = unknown, I = O> {
  readonly _output: O;
  readonly _input: I;
  parse(value: unknown, options?: ParseOptions): O;
  safeParse(value: unknown, options?: ParseOptions): SafeParseReturn<O>;
  parseAsync(value: unknown, options?: ParseOptions): Promise<O>;
  safeParseAsync(
    value: unknown,
    options?: ParseOptions,
  ): Promise<SafeParseReturn<O>>;
  optional(): ZodOptional<this>;
  nullable(): ZodNullable<this>;
  nullish(): ZodOptional<ZodNullable<this>>;
  default(
    value: Exclude<O, undefined> | (() => Exclude<O, undefined>),
  ): ZodDefault<this>;
  array(): ZodArray<this>;
  or<T extends ZodTypeAny>(other: T): ZodUnion<[this, T]>;
  refine(
    check: (value: O) => unknown,
    options?: ErrorOptions & { path?: (string | number)[]; abort?: boolean },
  ): this;
  superRefine(
    check: (value: O, context: RefinementContext) => void | Promise<void>,
  ): this;
  transform<T>(fn: (value: O) => T): ZodType<Awaited<T>, I>;
}
export type ZodTypeAny = ZodType<any, any>;
export type input<T extends ZodTypeAny> = T["_input"];
export type output<T extends ZodTypeAny> = T["_output"];
type Infer<T extends ZodTypeAny> = output<T>;
export { Infer as infer };
export interface ZodString<I = string> extends ZodType<string, I> {
  min(n: number, options?: ErrorOptions): this;
  max(n: number, options?: ErrorOptions): this;
  length(n: number, options?: ErrorOptions): this;
  nonempty(options?: ErrorOptions): this;
  email(options?: ErrorOptions): this;
  url(options?: ErrorOptions): this;
  regex(pattern: RegExp, options?: ErrorOptions): this;
  trim(): this;
  toLowerCase(): this;
  toUpperCase(): this;
}
export interface ZodNumber<I = number> extends ZodType<number, I> {
  min(n: number, options?: ErrorOptions): this;
  max(n: number, options?: ErrorOptions): this;
  int(options?: ErrorOptions): this;
  positive(options?: ErrorOptions): this;
  nonnegative(options?: ErrorOptions): this;
}
export interface ZodBoolean<I = boolean> extends ZodType<boolean, I> {}
export interface ZodOptional<T extends ZodTypeAny>
  extends ZodType<output<T> | undefined, input<T> | undefined> {
  unwrap(): T;
}
export interface ZodNullable<T extends ZodTypeAny>
  extends ZodType<output<T> | null, input<T> | null> {
  unwrap(): T;
}
export interface ZodDefault<T extends ZodTypeAny>
  extends ZodType<Exclude<output<T>, undefined>, input<T> | undefined> {
  unwrap(): T;
}
export interface ZodArray<T extends ZodTypeAny>
  extends ZodType<output<T>[], input<T>[]> {
  readonly element: T;
  min(n: number, options?: ErrorOptions): this;
  max(n: number, options?: ErrorOptions): this;
  length(n: number, options?: ErrorOptions): this;
  nonempty(options?: ErrorOptions): this;
}
export type ZodRawShape = Record<string, ZodTypeAny>;
type Materialize<T> = { [K in keyof T]: T[K] };
type ShapeValues<
  S extends ZodRawShape,
  M extends "_input" | "_output",
> = Materialize<
  { [K in keyof S as undefined extends S[K][M] ? never : K]: S[K][M] } & {
    [K in keyof S as undefined extends S[K][M] ? K : never]?: S[K][M];
  }
>;
export interface ZodObject<S extends ZodRawShape>
  extends ZodType<ShapeValues<S, "_output">, ShapeValues<S, "_input">> {
  readonly shape: Readonly<S>;
  extend<A extends ZodRawShape>(shape: A): ZodObject<Omit<S, keyof A> & A>;
  partial(): ZodObject<{ [K in keyof S]: ZodOptional<S[K]> }>;
  pick<M extends Partial<Record<keyof S, true>>>(
    mask: M,
  ): ZodObject<Pick<S, Extract<keyof M, keyof S>>>;
  omit<M extends Partial<Record<keyof S, true>>>(
    mask: M,
  ): ZodObject<Omit<S, keyof M>>;
  strip(): this;
  strict(): this;
  passthrough(): this;
}
export interface ZodUnion<T extends readonly ZodTypeAny[]>
  extends ZodType<output<T[number]>, input<T[number]>> {
  readonly options: T;
}
export interface ZodEnum<T extends string> extends ZodType<T> {
  readonly options: readonly T[];
  readonly enum: { [K in T]: K };
}
export interface ZodLiteral<T> extends ZodType<T> {}
export declare function string(options?: ErrorOptions): ZodString;
export declare function number(options?: ErrorOptions): ZodNumber;
export declare function boolean(options?: ErrorOptions): ZodBoolean;
export declare function object<const S extends ZodRawShape>(
  shape: S,
  options?: ErrorOptions,
): ZodObject<S>;
export declare function array<T extends ZodTypeAny>(
  element: T,
  options?: ErrorOptions,
): ZodArray<T>;
export declare function union<const T extends readonly ZodTypeAny[]>(
  options: T,
  error?: ErrorOptions,
): ZodUnion<T>;
export declare function literal<
  const T extends string | number | boolean | null | undefined,
>(value: T | readonly T[], options?: ErrorOptions): ZodLiteral<T>;
declare function enumeration<
  const T extends readonly string[] | Record<string, string>,
>(
  values: T,
  options?: ErrorOptions,
): ZodEnum<T extends readonly string[] ? T[number] : T[keyof T] & string>;
export { enumeration as enum };
export declare function record<T extends ZodTypeAny>(
  value: T,
): ZodType<Record<string, output<T>>, Record<string, input<T>>>;
export declare function record<T extends ZodTypeAny>(
  key: ZodString,
  value: T,
  options?: ErrorOptions,
): ZodType<Record<string, output<T>>, Record<string, input<T>>>;
export declare function lazy<T extends ZodTypeAny>(
  getter: () => T,
): ZodType<output<T>, input<T>>;
export declare function unknown(): ZodType<unknown>;
export declare function any(): ZodType<any>;
export declare function email(options?: ErrorOptions): ZodString;
export declare function url(options?: ErrorOptions): ZodString;
export declare const strictObject: typeof object;
export declare const looseObject: typeof object;
export declare const coerce: {
  string<I = unknown>(options?: ErrorOptions): ZodString<I>;
  number<I = unknown>(options?: ErrorOptions): ZodNumber<I>;
  boolean<I = unknown>(options?: ErrorOptions): ZodBoolean<I>;
};
export declare const ZodIssueCode: Readonly<{
  invalid_type: "invalid_type";
  invalid_value: "invalid_value";
  invalid_union: "invalid_union";
  invalid_format: "invalid_format";
  too_small: "too_small";
  too_big: "too_big";
  custom: "custom";
  unrecognized_keys: "unrecognized_keys";
  invalid_key: "invalid_key";
}>;
export declare const z: {
  string: typeof string;
  number: typeof number;
  boolean: typeof boolean;
  object: typeof object;
  array: typeof array;
  union: typeof union;
  literal: typeof literal;
  enum: typeof enumeration;
  record: typeof record;
  lazy: typeof lazy;
  unknown: typeof unknown;
  any: typeof any;
  email: typeof email;
  url: typeof url;
  strictObject: typeof strictObject;
  looseObject: typeof looseObject;
  coerce: typeof coerce;
  ZodError: typeof ZodError;
  ZodType: typeof ZodType;
  ZodIssueCode: typeof ZodIssueCode;
};
export declare namespace z {
  type infer<T extends ZodTypeAny> = T["_output"];
  type input<T extends ZodTypeAny> = T["_input"];
  type output<T extends ZodTypeAny> = T["_output"];
  type ZodTypeAny = ZodType<any, any>;
  type ZodType<O = unknown, I = O> = import("./index.mjs").ZodType<O, I>;
}
export default z;
