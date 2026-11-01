import type {EmotionCache} from 'vemotion-utils';

export type {EmotionCache};

/** An element of stylis's syntax tree, as plugins see it. */
export interface StylisElement {
  type: string;
  value: string;
  props: Array<string> | string;
  root: StylisElement | null;
  parent: StylisElement | null;
  children: Array<StylisElement> | string;
  line: number;
  column: number;
  length: number;
  return: string;
}
export type StylisPluginCallback = (element: StylisElement, index: number, children: Array<StylisElement>, callback: StylisPluginCallback) => string | void;
/** A stylis middleware, run on every element of every inserted style. */
export type StylisPlugin = (element: StylisElement, index: number, children: Array<StylisElement>, callback: StylisPluginCallback) => string | void;

export interface Options {
  /** Added to the cache's style elements. */
  nonce?: string;
  /** Replace the default plugins ([prefixer]). */
  stylisPlugins?: Array<StylisPlugin>;
  /** The class name prefix and data-emotion attribute; lower-case letters and -. */
  key: string;
  /** Where style elements go (document.head by default). */
  container?: Node;
  /** insertRule (true) or text nodes; defaults to true in production builds. */
  speedy?: boolean;
  /** @deprecated use `insertionPoint` instead */
  prepend?: boolean;
  /** Insert style elements after this element. */
  insertionPoint?: HTMLElement;
}

/** Emotion's default vendor prefixer, to combine with other plugins in stylisPlugins. */
export declare const prefixer: StylisPlugin;

export default function createCache(options: Options): EmotionCache;
