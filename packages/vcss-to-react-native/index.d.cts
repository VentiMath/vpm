export type StyleTuple = readonly [string, string];
export type StyleValue = string | number | boolean | null | undefined | Style | StyleValue[];
export interface Style { [name: string]: StyleValue }
export declare function transformRawValue(name: string, value: string): string | number | boolean | null | undefined;
export declare function getPropertyName(name: string): string;
export declare function getStylesForProperty(name: string, value: string, allowShorthand?: boolean): Style;
export default function transform(styleTuples: readonly StyleTuple[], shorthandBlacklist?: readonly string[]): Style;
