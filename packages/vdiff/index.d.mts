export interface Change {
  count: number;
  added: boolean;
  removed: boolean;
  value: string;
}
export interface WordOptions {
  ignoreCase?: boolean;
  /** Word-granularity segmentation; ignored by diffWordsWithSpace. */
  intlSegmenter?: Intl.Segmenter;
  oneChangePerToken?: boolean;
  /** Legacy diffWords switch selecting diffWordsWithSpace. */
  ignoreWhitespace?: boolean;
}
export interface BoundedWordOptions extends WordOptions {
  maxEditLength?: number;
  timeout?: number;
}
export type Callback = (changes: Change[] | undefined) => void;
export interface AsyncWordOptions extends BoundedWordOptions {
  callback: Callback;
}
export function diffWords(
  oldText: string,
  newText: string,
  callback: Callback,
): undefined;
export function diffWords(
  oldText: string,
  newText: string,
  options: AsyncWordOptions,
): undefined;
export function diffWords(
  oldText: string,
  newText: string,
  options?: WordOptions & {
    maxEditLength?: never;
    timeout?: never;
    callback?: never;
  },
): Change[];
export function diffWords(
  oldText: string,
  newText: string,
  options: BoundedWordOptions,
): Change[] | undefined;
export function diffWordsWithSpace(
  oldText: string,
  newText: string,
  callback: Callback,
): undefined;
export function diffWordsWithSpace(
  oldText: string,
  newText: string,
  options: AsyncWordOptions,
): undefined;
export function diffWordsWithSpace(
  oldText: string,
  newText: string,
  options?: WordOptions & {
    maxEditLength?: never;
    timeout?: never;
    callback?: never;
  },
): Change[];
export function diffWordsWithSpace(
  oldText: string,
  newText: string,
  options: BoundedWordOptions,
): Change[] | undefined;
