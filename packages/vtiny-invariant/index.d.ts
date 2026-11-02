/** Assert truthiness; evaluate a lazy diagnostic only on failure outside production. */
declare function invariant(condition: unknown, message?: string | (() => string)): asserts condition;
export = invariant;
