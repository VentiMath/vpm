declare namespace rtl {
  interface Element {
    type: string;
    value: string;
    props: string | string[];
    children: string | Element[];
    parent: Element | null;
    line: number;
    column: number;
    length: number;
    return: string;
  }
}
declare function rtl(
  element: rtl.Element,
  index: number,
  children: rtl.Element[],
  callback?: unknown,
): void;
declare const exported: typeof rtl & { readonly default: typeof rtl };
export = exported;
