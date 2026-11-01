export type Options = {
  /** Added as the nonce attribute of the sheet's elements. */
  nonce?: string;
  /** The data-emotion attribute of the sheet's elements. */
  key: string;
  /** Where the elements are inserted: an element, or a ShadowRoot. */
  container: Node;
  /** insertRule (true) or text nodes; defaults to true in production builds. */
  speedy?: boolean;
  /** Insert before the container's first child (use insertionPoint instead). */
  prepend?: boolean;
  /** Insert after this element. */
  insertionPoint?: HTMLElement;
};

export declare class StyleSheet {
  isSpeedy: boolean;
  ctr: number;
  tags: HTMLStyleElement[];
  container: Node;
  key: string;
  nonce: string | undefined;
  prepend: boolean | undefined;
  before: Element | null;
  insertionPoint: HTMLElement | undefined;
  constructor(options: Options);
  hydrate(nodes: HTMLStyleElement[]): void;
  insert(rule: string): void;
  flush(): void;
}
