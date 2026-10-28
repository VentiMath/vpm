import once, { strict, proto } from 'vonce';
const symbol = Symbol();
const callback = Object.assign(function (this: { base: number }, n: number) { return this.base + n; }, {
  label: 'addition', [symbol]: 3, called: 'not the state', value: 'not the result', onceError: false,
});
const wrapped = once(callback);
const result: number | undefined = wrapped.call({ base: 1 }, 2);
const called: boolean = wrapped.called;
const value: number | undefined = wrapped.value;
const label: string = wrapped.label;
const decoration: number = wrapped[symbol];
const strictWrapped = strict(callback);
const strictResult: number = strictWrapped.call({ base: 1 }, 2);
const error: string = strictWrapped.onceError;
const promise: Promise<number> | undefined = once(async () => 3)();
const applyDecoration: string = once(Object.assign(() => 1, { apply: 'metadata' })).apply;
// @ts-expect-error wrong argument
wrapped.call({ base: 1 }, '2');
// @ts-expect-error receiver required
wrapped(2);
// @ts-expect-error public state is read-only
wrapped.called = false;
// @ts-expect-error cached value is read-only
wrapped.value = 9;
// @ts-expect-error strict error text is read-only
strictWrapped.onceError = 'changed';
// @ts-expect-error normal wrapper has no onceError decoration
wrapped.onceError;
// @ts-expect-error reentrancy or a previous throw can leave value undefined
const guaranteed: number = result;
// @ts-expect-error callback must be callable
once({});
proto();
const explicit = (() => 2) as once.WithPrototype<() => number>;
const legacy: number | undefined = explicit.once()();
// @ts-expect-error opt-in runtime helper does not pollute global declarations
(() => 2).once();
void [called, value, label, decoration, strictResult, error, promise, guaranteed, legacy, applyDecoration];
