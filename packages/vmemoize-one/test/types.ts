import memoize = require('vmemoize-one');
const fn = memoize(function(this: {base: number}, amount: number) {return this.base + amount;});
const result: number = fn.call({base: 2}, 3);
fn.clear();
// @ts-expect-error The original argument type is preserved
fn.call({base: 2}, '3');
const comparison: memoize.EqualityFn<(value: number) => string> = (a, b) => a[0] === b[0];
void [result, comparison];
