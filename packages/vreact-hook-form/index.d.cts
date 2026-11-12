import type {
  ReactElement,
  ReactNode,
  BaseSyntheticEvent,
  RefCallback,
} from "react";
export type FieldValues = Record<string, any>;
export type DeepPartial<T> = T extends Date | Function
  ? T
  : T extends readonly (infer V)[]
    ? DeepPartial<V>[]
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;
type Paths<T, D extends unknown[] = []> = D["length"] extends 7
  ? never
  : T extends Date | Function
    ? never
    : T extends readonly (infer V)[]
      ? `${number}` | `${number}.${Paths<NonNullable<V>, [...D, 1]>}`
      : {
          [K in keyof T & string]:
            | K
            | (NonNullable<T[K]> extends object
                ? `${K}.${Paths<NonNullable<T[K]>, [...D, 1]>}`
                : never);
        }[keyof T & string];
export type FieldPath<T extends FieldValues> = string extends keyof T
  ? string
  : Paths<T>;
export type Path<T extends FieldValues> = FieldPath<T>;
export type FieldName<T extends FieldValues> = keyof T & string;
export type FieldPathValue<
  T,
  P extends string,
> = P extends `${infer K}.${infer R}`
  ? K extends keyof T
    ? FieldPathValue<NonNullable<T[K]>, R>
    : T extends readonly (infer V)[]
      ? FieldPathValue<V, R>
      : never
  : P extends keyof T
    ? T[P]
    : T extends readonly (infer V)[]
      ? V
      : never;
export interface FieldError {
  type: string;
  message?: string;
  ref?: any;
  types?: Record<string, string | string[] | boolean | undefined>;
}
export type FieldErrors<T extends FieldValues = FieldValues> = {
  [K in keyof T]?: NonNullable<T[K]> extends Date
    ? FieldError
    : NonNullable<T[K]> extends object
      ? FieldErrors<NonNullable<T[K]>> & Partial<FieldError>
      : FieldError;
} & { root?: FieldError & Record<string, any> };
export interface FormState<T extends FieldValues> {
  isDirty: boolean;
  isLoading: boolean;
  isSubmitted: boolean;
  isSubmitSuccessful: boolean;
  isSubmitting: boolean;
  isValidating: boolean;
  isValid: boolean;
  disabled: boolean;
  submitCount: number;
  isReady: boolean;
  dirtyFields: DeepPartial<Record<keyof T, any>>;
  touchedFields: DeepPartial<Record<keyof T, any>>;
  validatingFields: DeepPartial<Record<keyof T, any>>;
  errors: FieldErrors<T>;
  defaultValues?: DeepPartial<T>;
}
export interface FieldState {
  invalid: boolean;
  isDirty: boolean;
  isTouched: boolean;
  isValidating: boolean;
  error?: FieldError;
}
export type CriteriaMode = "firstError" | "all";
export interface ResolverOptions<T extends FieldValues> {
  criteriaMode?: CriteriaMode;
  names?: FieldName<T>[];
  fields: Record<string, any>;
  shouldUseNativeValidation?: boolean;
}
export type ResolverResult<T extends FieldValues = FieldValues, O = T> =
  | { values: O; errors: {} }
  | { values: {}; errors: FieldErrors<T> };
export type Resolver<T extends FieldValues = FieldValues, C = any, O = T> = (
  values: T,
  context: C | undefined,
  options: ResolverOptions<T>,
) => ResolverResult<T, O> | Promise<ResolverResult<T, O>>;
export type Validate<V, T> = (
  value: V,
  values: T,
) =>
  | boolean
  | string
  | string[]
  | undefined
  | Promise<boolean | string | string[] | undefined>;
export type ValidationRule<V> = V | { value: V; message: string };
export type RegisterOptions<
  T extends FieldValues = FieldValues,
  N extends FieldPath<T> = FieldPath<T>,
> = {
  required?: string | ValidationRule<boolean>;
  min?: ValidationRule<number | string>;
  max?: ValidationRule<number | string>;
  minLength?: ValidationRule<number>;
  maxLength?: ValidationRule<number>;
  pattern?: ValidationRule<RegExp>;
  validate?:
    | Validate<FieldPathValue<T, N>, T>
    | Record<string, Validate<FieldPathValue<T, N>, T>>;
  disabled?: boolean;
  value?: FieldPathValue<T, N>;
  valueAsNumber?: boolean;
  valueAsDate?: boolean;
  setValueAs?: (value: any) => any;
  onChange?: (event: any) => void;
  onBlur?: (event: any) => void;
};
export interface SetValueConfig {
  shouldValidate?: boolean;
  shouldDirty?: boolean;
  shouldTouch?: boolean;
}
export type UseFormSetValue<T extends FieldValues> = <N extends FieldPath<T>>(
  name: N,
  value: FieldPathValue<T, N>,
  options?: SetValueConfig,
) => void;
export interface UseFormWatch<T extends FieldValues> {
  (): T;
  <N extends FieldPath<T>>(
    name: N,
    defaultValue?: FieldPathValue<T, N>,
  ): FieldPathValue<T, N>;
  <N extends readonly FieldPath<T>[]>(
    names: readonly [...N],
  ): { [K in keyof N]: FieldPathValue<T, N[K]> };
  (
    callback: (
      values: DeepPartial<T>,
      info: { name?: FieldPath<T>; type?: string },
    ) => void,
  ): { unsubscribe(): void };
}
export interface UseFormGetValues<T extends FieldValues> {
  (): T;
  <N extends FieldPath<T>>(name: N): FieldPathValue<T, N>;
  <N extends readonly FieldPath<T>[]>(
    names: readonly [...N],
  ): { [K in keyof N]: FieldPathValue<T, N[K]> };
}
export interface KeepStateOptions {
  keepErrors?: boolean;
  keepDirty?: boolean;
  keepDirtyValues?: boolean;
  keepValues?: boolean;
  keepDefaultValues?: boolean;
  keepTouched?: boolean;
  keepIsSubmitted?: boolean;
  keepIsSubmitSuccessful?: boolean;
  keepSubmitCount?: boolean;
  keepIsValid?: boolean;
}
export type UseFormReset<T extends FieldValues> = (
  values?: T | DeepPartial<T> | ((values: T) => T),
  options?: KeepStateOptions,
) => void;
export type SubmitHandler<T> = (
  data: T,
  event?: BaseSyntheticEvent,
) => unknown | Promise<unknown>;
export type SubmitErrorHandler<T extends FieldValues> = (
  errors: FieldErrors<T>,
  event?: BaseSyntheticEvent,
) => unknown | Promise<unknown>;
export interface UseFormProps<
  T extends FieldValues = FieldValues,
  C = any,
  O = T,
> {
  defaultValues?: DeepPartial<T>;
  values?: T;
  errors?: FieldErrors<T>;
  mode?: "onChange" | "onBlur" | "onSubmit" | "onTouched" | "all";
  reValidateMode?: "onChange" | "onBlur" | "onSubmit";
  resolver?: Resolver<T, C, O>;
  context?: C;
  criteriaMode?: CriteriaMode;
  shouldUnregister?: boolean;
  shouldFocusError?: boolean;
  disabled?: boolean;
  resetOptions?: KeepStateOptions;
}
export interface UseFormRegisterReturn<N extends string = string> {
  name: N;
  onChange: (event: any) => Promise<any>;
  onBlur: (event: any) => Promise<any>;
  ref: RefCallback<any>;
  disabled?: boolean;
}
export type UseFormRegister<T extends FieldValues> = <N extends FieldPath<T>>(
  name: N,
  options?: RegisterOptions<T, N>,
) => UseFormRegisterReturn<N>;
export interface Control<T extends FieldValues = FieldValues, C = any, O = T> {
  readonly __values?: T;
  readonly __context?: C;
  readonly __output?: O;
  register: UseFormRegister<T>;
  unregister: UseFormReturn<T, C, O>["unregister"];
  getValues: UseFormGetValues<T>;
  setValue: UseFormSetValue<T>;
  reset: UseFormReset<T>;
  getFieldState: UseFormReturn<T, C, O>["getFieldState"];
}
export interface UseFormReturn<
  T extends FieldValues = FieldValues,
  C = any,
  O = T,
> {
  control: Control<T, C, O>;
  register: UseFormRegister<T>;
  watch: UseFormWatch<T>;
  getValues: UseFormGetValues<T>;
  setValue: UseFormSetValue<T>;
  reset: UseFormReset<T>;
  formState: FormState<T>;
  trigger: (
    names?: FieldPath<T> | FieldPath<T>[],
    options?: { shouldFocus?: boolean },
  ) => Promise<boolean>;
  setError: (
    name: FieldPath<T> | `root.${string}` | "root",
    error: Omit<FieldError, "ref">,
    options?: { shouldFocus?: boolean },
  ) => void;
  clearErrors: (name?: FieldPath<T> | FieldPath<T>[]) => void;
  getFieldState: (name: FieldPath<T>, state?: FormState<T>) => FieldState;
  setFocus: (name: FieldPath<T>, options?: { shouldSelect?: boolean }) => void;
  unregister: (
    names?: FieldPath<T> | FieldPath<T>[],
    options?: {
      keepValue?: boolean;
      keepDefaultValue?: boolean;
      keepError?: boolean;
      keepDirty?: boolean;
      keepTouched?: boolean;
    },
  ) => void;
  handleSubmit: (
    valid: SubmitHandler<O>,
    invalid?: SubmitErrorHandler<T>,
  ) => (event?: BaseSyntheticEvent) => Promise<void>;
  subscribe: (options: {
    name?: FieldPath<T> | FieldPath<T>[];
    formState?: Partial<Record<keyof FormState<T> | "values", boolean>>;
    callback: (state: FormState<T> & { values: T; name?: string }) => void;
  }) => () => void;
}
export declare function useForm<
  T extends FieldValues = FieldValues,
  C = any,
  O = T,
>(options?: UseFormProps<T, C, O>): UseFormReturn<T, C, O>;
export declare function createFormControl<
  T extends FieldValues = FieldValues,
  C = any,
  O = T,
>(
  options?: UseFormProps<T, C, O>,
): UseFormReturn<T, C, O> & { formControl: UseFormReturn<T, C, O> };
export type UseControllerProps<
  T extends FieldValues = FieldValues,
  N extends FieldPath<T> = FieldPath<T>,
> = {
  name: N;
  control?: Control<T, any, any>;
  defaultValue?: FieldPathValue<T, N>;
  rules?: RegisterOptions<T, N>;
  disabled?: boolean;
  shouldUnregister?: boolean;
};
export interface ControllerRenderProps<
  T extends FieldValues = FieldValues,
  N extends FieldPath<T> = FieldPath<T>,
> {
  name: N;
  value: FieldPathValue<T, N>;
  onChange: (...event: any[]) => void;
  onBlur: () => void;
  ref: RefCallback<any>;
  disabled?: boolean;
}
export interface UseControllerReturn<
  T extends FieldValues = FieldValues,
  N extends FieldPath<T> = FieldPath<T>,
> {
  field: ControllerRenderProps<T, N>;
  fieldState: FieldState;
  formState: FormState<T>;
}
export declare function useController<
  T extends FieldValues = FieldValues,
  N extends FieldPath<T> = FieldPath<T>,
>(props: UseControllerProps<T, N>): UseControllerReturn<T, N>;
export type ControllerProps<
  T extends FieldValues = FieldValues,
  N extends FieldPath<T> = FieldPath<T>,
> = UseControllerProps<T, N> & {
  render: (props: UseControllerReturn<T, N>) => ReactElement;
};
export declare function Controller<
  T extends FieldValues = FieldValues,
  N extends FieldPath<T> = FieldPath<T>,
>(props: ControllerProps<T, N>): ReactElement;
export declare function FormProvider<T extends FieldValues, C = any, O = T>(
  props: UseFormReturn<T, C, O> & { children?: ReactNode },
): ReactElement;
export declare function useFormContext<
  T extends FieldValues = FieldValues,
  C = any,
  O = T,
>(): UseFormReturn<T, C, O>;
export declare function useFormState<
  T extends FieldValues = FieldValues,
>(options?: { control?: Control<T, any, any> }): FormState<T>;
export declare function useWatch<
  T extends FieldValues = FieldValues,
  N extends FieldPath<T> = FieldPath<T>,
>(options: {
  control?: Control<T, any, any>;
  name: N;
  defaultValue?: FieldPathValue<T, N>;
}): FieldPathValue<T, N>;
export declare function useWatch<
  T extends FieldValues = FieldValues,
>(options?: { control?: Control<T, any, any> }): T;
export declare function get(
  object: any,
  path?: string,
  defaultValue?: any,
): any;
export declare function set(object: any, path: string, value: any): any;
export declare function appendErrors(
  name: string,
  validateAllFieldCriteria: boolean,
  errors: FieldErrors,
  type: string,
  message: string | string[],
): FieldError | {};
