import type {StyleSheet} from 'vemotion-sheet';

export type {StyleSheet};

/** Styles by class name (`key-name`). */
export type RegisteredCache = Record<string, string | undefined>;

export type SerializedStyles = {
  name: string;
  styles: string;
  /** Keyframes and other styles inserted with these. */
  next?: SerializedStyles;
};

export type EmotionCache = {
  inserted: Record<string, string | true | undefined>;
  registered: RegisteredCache;
  sheet: StyleSheet;
  key: string;
  compat?: true;
  nonce?: string;
  insert: (selector: string, serialized: SerializedStyles, sheet: StyleSheet, shouldCache: boolean) => string | void;
};

export declare function getRegisteredStyles(registered: RegisteredCache, registeredStyles: string[], classNames: string): string;
export declare function registerStyles(cache: EmotionCache, serialized: SerializedStyles, isStringTag: boolean): void;
export declare function insertStyles(cache: EmotionCache, serialized: SerializedStyles, isStringTag: boolean): string | undefined;
