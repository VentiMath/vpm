declare namespace themeable {
  type Name = PropertyKey | boolean | null | undefined;
  type Theme = Readonly<Record<PropertyKey, unknown>>;
  type Props<K> =
    | { key: K; className: string }
    | { key: K; style: Record<PropertyKey, unknown> };
  interface Themer {
    <K>(key: K, ...names: Name[]): Props<K>;
  }
  interface ClassThemer {
    <K>(key: K, ...names: Name[]): { key: K; className: string };
  }
}
declare function themeable<T>(
  theme: readonly [
    Readonly<Record<PropertyKey, T>>,
    (...styles: T[]) => string,
  ],
): themeable.ClassThemer;
declare function themeable(theme: themeable.Theme): themeable.Themer;
export = themeable;
