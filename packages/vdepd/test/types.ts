import depd from 'vdepd';
const warn = depd('example'); warn(); warn('use next');
const fn = Object.assign((x: number) => String(x), { version: 1 });
const wrapped = warn.function(fn); const result: string = wrapped(3); const version: number = wrapped.version;
class Example { constructor(readonly x: number) {} }
const Constructor = warn.function(Example); const example: Example = new Constructor(2);
const symbol = Symbol(); const obj = { [symbol]: 1, x: 'a', 0: true };
warn.property(obj, symbol); warn.property(obj, 'x'); warn.property(obj, 0);
const detached = warn.function; detached(fn);
function event(error: depd.DeprecationError) { const namespace: string = error.namespace; return namespace; }
// @ts-expect-error namespace must be a string
depd(1);
// @ts-expect-error function must be callable or constructable
warn.function({});
// @ts-expect-error property must exist in the object type
warn.property(obj, 'missing');
// @ts-expect-error warning text must be a string
warn(1);
void [result, version, example, event];
