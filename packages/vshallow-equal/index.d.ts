/** Compare array indices or own enumerable string-keyed properties using ===. */
export declare function shallowEqual(left: unknown, right: unknown): boolean;
export declare function shallowEqualArrays(left: readonly unknown[] | null | undefined, right: readonly unknown[] | null | undefined): boolean;
export declare function shallowEqualObjects(left: object | null | undefined, right: object | null | undefined): boolean;
