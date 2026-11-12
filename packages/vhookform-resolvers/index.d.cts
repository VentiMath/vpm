export interface FieldError {
  type: string;
  message?: string;
  ref?: any;
  types?: Record<string, string | string[]>;
}
export interface ResolverOptions {
  criteriaMode?: "firstError" | "all";
  fields: Record<string, any>;
  names?: readonly string[];
  shouldUseNativeValidation?: boolean;
}
export type FieldErrors<T> = {
  [K in keyof T]?: NonNullable<T[K]> extends object
    ? FieldErrors<NonNullable<T[K]>> & Partial<FieldError>
    : FieldError;
} & { root?: FieldError & Record<string, any> };
export type Resolver<Input, Output> = (
  values: Input,
  context: any,
  options: ResolverOptions,
) => Promise<
  { values: Output; errors: {} } | { values: {}; errors: FieldErrors<Input> }
>;
export declare function toNestErrors<T = Record<string, any>>(
  errors: Record<string, FieldError>,
  options?: ResolverOptions,
): FieldErrors<T>;
export declare function validateFieldsNatively(
  errors: Record<string, FieldError>,
  options: ResolverOptions,
): void;
