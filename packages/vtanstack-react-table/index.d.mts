import type * as React from "react";
import type {
  Table,
  TableOptions,
  TableState,
  TableFeatures,
  ReadableAtom,
  Cell,
  Header,
} from "vtanstack-table-core";
export * from "vtanstack-table-core";
export type Renderable<P> = React.ReactNode | React.ComponentType<P>;
export interface SubscribeSource<T> {
  get(): T;
  subscribe(
    listener: (value: T) => void,
  ): { unsubscribe(): void } | (() => void);
}
export type SubscribeProps<T, S = T> = {
  source: SubscribeSource<T>;
  selector?: (value: T) => S;
  children: React.ReactNode | ((value: S) => React.ReactNode);
};
export function Subscribe<T>(props: {
  source: SubscribeSource<T>;
  selector?: undefined;
  children: React.ReactNode | ((value: T) => React.ReactNode);
}): React.ReactNode;
export function Subscribe<T, S>(props: {
  source: SubscribeSource<T>;
  selector: (value: T) => S;
  children: React.ReactNode | ((value: S) => React.ReactNode);
}): React.ReactNode;
export type FlexRenderProps<T, V = unknown> =
  | { cell: Cell<T, V>; header?: never; footer?: never }
  | { header: Header<T, V>; cell?: never; footer?: never }
  | { footer: Header<T, V>; cell?: never; header?: never };
export function FlexRender<T, V = unknown>(
  props: FlexRenderProps<T, V>,
): React.ReactNode;
export function flexRender<P extends object>(
  component: Renderable<P> | ((props: P) => unknown),
  props: P,
): React.ReactNode;
export type ReactTable<
  F extends TableFeatures,
  T,
  S = TableState,
> = Table<T> & {
  readonly state: Readonly<S>;
  FlexRender: typeof FlexRender;
  Subscribe: {
    (props: {
      source?: undefined;
      selector?: undefined;
      children: React.ReactNode | ((value: TableState) => React.ReactNode);
    }): React.ReactNode;
    <V>(props: {
      source: SubscribeSource<V>;
      selector?: undefined;
      children: React.ReactNode | ((value: V) => React.ReactNode);
    }): React.ReactNode;
    <V, R>(props: {
      source: SubscribeSource<V>;
      selector: (value: V) => R;
      children: React.ReactNode | ((value: R) => React.ReactNode);
    }): React.ReactNode;
    <R>(props: {
      source?: undefined;
      selector: (value: TableState) => R;
      children: React.ReactNode | ((value: R) => React.ReactNode);
    }): React.ReactNode;
  };
};
export function useTable<F extends TableFeatures, T, S = TableState>(
  options: TableOptions<T> & { features?: F },
  selector?: (state: TableState) => S,
): ReactTable<F, T, S>;
/** Table 8-compatible entry for existing MRT consumers. */
export function useReactTable<T>(options: TableOptions<T>): Table<T>;
export type LegacyTableOptions<T> = TableOptions<T>;
export type LegacyReactTable<T> = ReactTable<TableFeatures, T>;
export function useLegacyTable<T>(
  options: LegacyTableOptions<T>,
): LegacyReactTable<T>;
export { createColumnHelper as legacyCreateColumnHelper } from "vtanstack-table-core";
export type ColumnSizingInfoState = TableState["columnSizingInfo"];
export type AccessorFn<T, V = unknown> = (row: T, index: number) => V;
export type DeepKeys<T, D extends unknown[] = []> = D["length"] extends 6
  ? never
  : T extends readonly (infer V)[]
    ? `${number}` | `${number}.${DeepKeys<V, [...D, 0]>}`
    : T extends object
      ? {
          [K in keyof T & string]:
            | K
            | (T[K] extends object
                ? `${K}.${DeepKeys<T[K], [...D, 0]>}`
                : never);
        }[keyof T & string]
      : never;
export type DeepValue<T, P> = P extends keyof T
  ? T[P]
  : P extends `${infer A}.${infer B}`
    ? A extends keyof T
      ? DeepValue<T[A], B>
      : T extends readonly (infer V)[]
        ? DeepValue<V, B>
        : never
    : never;

export interface ColumnMeta<TData, TValue> {}
