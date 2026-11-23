import type * as React from "react";

/** Public polymorphic component contract; own props take precedence over root props. */
export interface OverridableTypeMap {
  props: object;
  defaultComponent: React.ElementType;
}
export interface CommonProps {
  className?: string;
  style?: React.CSSProperties;
  classes?: Partial<Record<never, string>>;
}
type RemainingRootProps<P, K extends PropertyKey> = P extends unknown ? Omit<P, K> : never;
export type BaseProps<M extends OverridableTypeMap> = M["props"] & CommonProps;
export type OverrideProps<M extends OverridableTypeMap, C extends React.ElementType> =
  BaseProps<M> & RemainingRootProps<React.ComponentPropsWithRef<C>, keyof BaseProps<M>>;
export type DefaultComponentProps<M extends OverridableTypeMap> = OverrideProps<M, M["defaultComponent"]>;
export interface OverridableComponent<M extends OverridableTypeMap> {
  <C extends React.ElementType>(props: { component: C } & OverrideProps<M, C>): React.JSX.Element | null;
  (props: DefaultComponentProps<M>): React.JSX.Element | null;
  propTypes?: Record<string, unknown>;
}
