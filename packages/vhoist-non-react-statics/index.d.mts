type ReactStatics =
  | "childContextTypes"
  | "contextType"
  | "contextTypes"
  | "defaultProps"
  | "displayName"
  | "getDefaultProps"
  | "getDerivedStateFromError"
  | "getDerivedStateFromProps"
  | "mixins"
  | "propTypes"
  | "type";
type FunctionStatics =
  | "name"
  | "length"
  | "prototype"
  | "caller"
  | "callee"
  | "arguments"
  | "arity";
type Excluded<S> = S extends { readonly $$typeof: symbol }
  ?
      | "$$typeof"
      | "render"
      | "compare"
      | "type"
      | "defaultProps"
      | "displayName"
      | "propTypes"
  : ReactStatics;
type TrueKeys<C> = {
  [K in keyof C]: C[K] extends false | null | undefined | 0 | "" ? never : K;
}[keyof C];
export type NonReactStatics<S, C = {}> = Pick<
  S,
  Exclude<keyof S, FunctionStatics | Excluded<S> | TrueKeys<C>>
>;
export default function hoistNonReactStatics<
  T extends object,
  S extends object | string,
  C extends Partial<Record<PropertyKey, unknown>> = {},
>(
  target: T,
  source: S,
  blacklist?: C,
): T & (S extends string ? {} : NonReactStatics<S, C>);
