/** Replace literal {{projectId}} tokens in strings and own enumerable data fields.
 * Plain records retain identity and are mutated; arrays are cloned. Other objects
 * are opaque. Accessors and inherited fields are not evaluated. Cycles are retained.
 */
export declare function replaceProjectIdToken<T>(value: T, projectId?: string): T;
export declare class MissingProjectIdError extends Error {constructor();}
