import merge from 'vmerge-descriptors';
const symbol = Symbol();
const source = { value: 'replaced', [symbol]: true, added: 2 };
const destination = { value: 1, original: true };
const replaced = merge(destination, source);
const replacement: string = replaced.value;
const original: boolean = replaced.original;
const sym: boolean = replaced[symbol];
const kept: number = merge(destination, source, false).value;
declare const overwrite: boolean;
const dynamic: string | number = merge(destination, source, overwrite).value;
declare const optionalOverwrite: boolean | undefined;
const optional: string | number = merge(destination, source, optionalOverwrite).value;
const callable = merge(Object.assign((n: number) => n + 1, { value: 1 }), source);
const called: number = callable(3);
const decorated: string = callable.value;
const notCallable = merge({}, Object.assign(() => 1, { property: 3 }));
const property: number = notCallable.property;
// @ts-expect-error copying a function's properties does not copy callability
notCallable();
// @ts-expect-error overwrite false does not make a nonfunction callable
merge({}, () => 1, false)();
class Destination { constructor(public n: number) {} }
const Constructor = merge(Destination, { label: 'constructor' });
const instance: Destination = new Constructor(3);
const readonly = merge({}, { n: 1 } as const);
// @ts-expect-error retains source readonly properties
readonly.n = 2;
// @ts-expect-error overwrite must be a boolean
merge({}, {}, 1);
// @ts-expect-error source must be an object or function
merge({}, 'value');
// @ts-expect-error destination must be an object or function
merge(null, {});
// @ts-expect-error replacement property no longer has the old type
const old: number = replaced.value;
void [replacement, original, sym, kept, dynamic, optional, called, decorated, property, instance, old];
