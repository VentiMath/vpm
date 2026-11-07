/** The fields consumed by normalization; native KeyboardEvent is supported. */
export interface KeyboardEventLike {
  readonly key?: string;
  readonly keyCode?: number;
  readonly shiftKey?: boolean;
  readonly metaKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly altKey?: boolean;
}
export declare function keyName(event: Event | KeyboardEventLike): string;
/** Mutable legacy US-layout fallback tables. Unknown codes have no entry. */
export declare const base: { [keyCode: number]: string };
export declare const shift: { [keyCode: number]: string };
