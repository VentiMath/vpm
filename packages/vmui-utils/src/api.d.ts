import type * as React from "react";
export type EventHandlers = Record<string, (...args: any[]) => any>;
export interface DataAttributesOverrides {}
export type WithDataAttributes<P> = P &
  DataAttributesOverrides & {
    [K in `data-${string}`]?: string | number | boolean | undefined;
  };
export type WithOptionalOwnerState<P extends { ownerState: unknown }> = Omit<
  P,
  "ownerState"
> &
  Partial<Pick<P, "ownerState">>;
export type SlotComponentProps<C extends React.ElementType, O, S> =
  | WithDataAttributes<Partial<React.ComponentPropsWithRef<C>> & O>
  | ((
      state: S,
    ) => WithDataAttributes<Partial<React.ComponentPropsWithRef<C>> & O>);
export type SlotComponentPropsWithSlotState<
  C extends React.ElementType,
  O,
  S,
  T,
> =
  | WithDataAttributes<Partial<React.ComponentPropsWithRef<C>> & O>
  | ((
      state: S,
      slot: T,
    ) => WithDataAttributes<Partial<React.ComponentPropsWithRef<C>> & O>);
export function isPlainObject(
  value: unknown,
): value is Record<PropertyKey, unknown>;
export interface DeepmergeOptions {
  clone?: boolean;
}
export function deepmerge<T>(
  target: T,
  source: unknown,
  options?: DeepmergeOptions,
): T;
export function fastDeepAssign<T extends Record<string, any>>(
  target: T,
  source: unknown,
): T;
export function fastObjectShallowCompare<T extends Record<string, any> | null>(
  a: T,
  b: T,
): boolean;
export function resolveProps<T extends Record<string, any>>(
  defaults: T,
  props: T,
  mergeClassNameAndStyle?: boolean,
): T;
export const ClassNameGenerator: {
  configure(generator: (name: string) => string): void;
  generate(name: string): string;
  reset(): void;
};
export type GlobalStateSlot =
  | "active"
  | "checked"
  | "completed"
  | "disabled"
  | "error"
  | "expanded"
  | "focused"
  | "focusVisible"
  | "open"
  | "readOnly"
  | "required"
  | "selected";
export const globalStateClasses: Record<GlobalStateSlot, string>;
export function isGlobalState(slot: string): boolean;
export function generateUtilityClass(
  component: string,
  slot: string,
  prefix?: string,
): string;
export function generateUtilityClasses<S extends string>(
  component: string,
  slots: readonly S[],
  prefix?: string,
): Record<S, string>;
export function composeClasses<K extends string>(
  slots: Record<K, readonly (string | false | null | undefined)[]>,
  getClass: (slot: string) => string,
  classes?: Record<string, string>,
): Record<K, string>;
export function capitalize(value: string): string;
export function clamp(value: number, min?: number, max?: number): number;
export function isObjectEmpty(value: object): boolean;
export function isEventHandler(key: string, value: unknown): boolean;
export function extractEventHandlers(
  value: Record<string, unknown> | undefined,
): EventHandlers;
export function omitEventHandlers<T extends object>(
  value: T | undefined,
): Partial<T>;
export function resolveComponentProps<P, S, T>(
  props: P | ((state: S, slotState?: T) => P) | undefined,
  state: S,
  slotState?: T,
): P | undefined;
export function isHostComponent(
  type: React.ElementType,
): type is keyof React.JSX.IntrinsicElements;
export type AppendOwnerStateReturnType<
  C extends React.ElementType,
  P,
  S,
> = P & {
  ownerState: C extends keyof React.JSX.IntrinsicElements ? undefined : S;
};
export function appendOwnerState<
  C extends React.ElementType,
  P extends object,
  S,
>(type: C | undefined, props: P, state: S): AppendOwnerStateReturnType<C, P, S>;
export type WithCommonProps<P> = P & {
  className?: string;
  style?: React.CSSProperties;
  ref?: React.Ref<any>;
};
export interface MergeSlotPropsParameters<I, F, E, A> {
  getSlotProps?: (handlers: EventHandlers) => WithCommonProps<I>;
  externalSlotProps?: WithCommonProps<E>;
  externalForwardedProps?: WithCommonProps<F>;
  additionalProps?: WithCommonProps<A>;
  className?: unknown;
}
export type MergeSlotPropsResult<I, F, E, A> = {
  props: I & F & E & A & { className?: string; style?: React.CSSProperties };
  internalRef: React.Ref<any> | undefined;
};
export function mergeSlotProps<I, F, E, A>(
  parameters: MergeSlotPropsParameters<I, F, E, A>,
): MergeSlotPropsResult<I, F, E, A>;
export type UseSlotPropsParameters<
  C extends React.ElementType,
  I,
  F,
  E,
  A,
  S,
> = Omit<MergeSlotPropsParameters<I, F, E, A>, "externalSlotProps"> & {
  elementType: C | undefined;
  ownerState: S;
  externalSlotProps: E | ((state: S) => E) | undefined;
  skipResolvingSlotProps?: boolean;
};
export type UseSlotPropsResult<
  C extends React.ElementType,
  I,
  A,
  S,
> = AppendOwnerStateReturnType<
  C,
  I & A & { ref: React.RefCallback<any> | null },
  S
>;
export function useSlotProps<C extends React.ElementType, I, A, S>(
  parameters: UseSlotPropsParameters<
    C,
    I,
    object,
    WithCommonProps<Record<string, any>>,
    A,
    S
  >,
): UseSlotPropsResult<C, I, A, S>;
export function getDisplayName(
  component: React.ElementType,
): string | undefined;
export function isMuiElement(
  element: unknown,
  names: readonly string[],
): boolean;
export function getValidReactChildren(
  children: React.ReactNode,
): React.ReactElement[];
export function getReactElementRef(
  element: React.ReactElement,
): React.Ref<any> | null;
export function getReactNodeRef(
  element: React.ReactNode,
): React.Ref<any> | null;
export function formatMuiErrorMessage(code: number, ...args: string[]): string;
export const visuallyHidden: React.CSSProperties;
export const ponyfillGlobal: typeof globalThis;
export function ownerDocument(node?: Node | null): Document;
export function ownerWindow(node?: Node | null): Window;
export function contains(
  parent?: Element | null,
  child?: Element | null,
): boolean;
export function getActiveElement(root: Document | ShadowRoot): Element | null;
export function getEventTarget(event: Event): EventTarget | null;
export function getScrollbarSize(window?: Window): number;
export function isFocusVisible(element: Element): boolean;
export function createChainedFunction<A extends unknown[], T>(
  ...callbacks: Array<((this: T, ...args: A) => unknown) | null | undefined>
): (this: T, ...args: A) => void;
export interface Cancelable {
  clear(): void;
}
export function debounce<F extends (...args: any[]) => any>(
  callback: F,
  wait?: number,
): ((...args: Parameters<F>) => void) & Cancelable;
export function setRef<T>(
  ref: React.Ref<T> | undefined,
  value: T | null,
): void | (() => void);
export class Timeout {
  static create(): Timeout;
  currentId: ReturnType<typeof setTimeout> | null;
  start(delay: number, callback: () => void): void;
  clear: () => void;
  disposeEffect: () => () => void;
}
export interface UseControlledProps<T = unknown> {
  controlled: T | undefined;
  default: T | undefined;
  name: string;
  state?: string;
}
export function useControlled<T>(
  props: Omit<UseControlledProps<T>, "controlled" | "default"> & {
    controlled: undefined;
    default: T;
  },
): [T, React.Dispatch<React.SetStateAction<T | undefined>>];
export function useControlled<T>(
  props: UseControlledProps<T> & { controlled: T },
): [T, React.Dispatch<React.SetStateAction<T | undefined>>];
export function useControlled<T = unknown>(
  props: UseControlledProps<T>,
): [T | undefined, React.Dispatch<React.SetStateAction<T | undefined>>];
export const useEnhancedEffect: typeof React.useLayoutEffect;
export function useEventCallback<F extends (...args: any[]) => any>(fn: F): F;
export function useForkRef<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> | null;
export function useId(override?: string): string;
export function useLazyRef<T, U>(
  init: (arg?: U) => T,
  arg?: U,
): React.RefObject<T>;
export function useTimeout(): Timeout;
export function useOnMount(callback: React.EffectCallback): void;
export function usePreviousProps<T>(value: T): Partial<T>;
export function useForcedRerendering(): () => void;
export interface ValueRef<T> {
  current: T;
  next: T;
  effect: () => void;
}
export function useValueAsRef<T>(value: T): ValueRef<T>;
export interface UseIsFocusVisibleResult {
  isFocusVisibleRef: React.RefObject<boolean>;
  onBlur: (event: React.FocusEvent) => boolean;
  onFocus: (event: React.FocusEvent) => boolean;
  ref: React.RefCallback<Element>;
}
export function useIsFocusVisible(): UseIsFocusVisibleResult;
export function teardown(document: Document): void;
export interface Validator<T = unknown> {
  (
    props: Record<string, any>,
    propName: string,
    componentName?: string,
    location?: string,
    propFullName?: string,
    ...rest: unknown[]
  ): Error | null;
}
export interface Requireable<T> extends Validator<T> {
  isRequired: Validator<NonNullable<T>>;
}
export const refType: Requireable<React.Ref<unknown>>;
export const elementAcceptingRef: Requireable<React.ReactElement>;
export const elementTypeAcceptingRef: Requireable<React.ElementType>;
export const integerPropType: Requireable<number>;
export function getTypeByValue(value: unknown): string;
export const HTMLElementType: Validator<HTMLElement>;
export function chainPropTypes<A, B>(
  first: Validator<A>,
  second: Validator<B>,
): Validator<A & B>;
export function deprecatedPropType<T>(
  validator: Validator<T>,
  reason: string,
): Validator<T>;
export const unsupportedProp: Validator;
export function requirePropFactory(
  name: string,
  component?: React.ComponentType<any>,
): (requiredProp: string) => Validator;
export function exactProp<T>(
  validators: Record<keyof T, Validator>,
): Record<keyof T, Validator>;
