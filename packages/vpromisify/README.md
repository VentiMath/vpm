# vpromisify

Callback/promise adapters targeting **@google-cloud/promisify 6.2.1** on
**Node 24+ and Bun**. Zero runtime dependencies. Current Storage **8.4.0**
metadata and existence methods are verified with these wrappers.

```js
const {promisify, callbackify, promisifyAll, callbackifyAll} = require('vpromisify');
const read = promisify((key, callback) => callback(null, key, {cached: true}));
const [value, metadata] = await read('example');
read('example', (error, value, metadata) => {});
const single = promisify(callback => callback(null, 42), {singular: true});
const value42 = await single();
```

All four functions are named CommonJS and ESM exports. Wrappers preserve their
receiver. `promisify` delegates calls containing a final callback directly,
including their original return value and trailing undefined arguments. Without
a callback, it trims trailing undefined values and appends an error-first
callback. Success resolves to the result array; `singular: true` unwraps exactly
one result. A receiver's `Promise` constructor override remains supported.

`callbackify` returns the original result unchanged when no callback is supplied.
With a callback it spreads array results, passes scalar values as one result,
and returns undefined. It recognizes callbacks followed by undefined arguments,
assimilates thenables, and reports synchronous throws asynchronously. Falsy
rejection reasons produce an Error with `code: 'ERR_FALSY_VALUE_REJECTION'` and
the original `reason`, avoiding a success-shaped error argument. A callback
that throws is not invoked a second time; its throw remains a rejected promise.

`promisifyAll(Class, options)` and `callbackifyAll(Class, options)` wrap own
prototype methods. Both skip constructor, accessor, private/underscore and
stream-named methods, plus names in `exclude`. `promisifyAll` also skips names
ending in `promise`, as upstream does. Symbols and inherited methods are not
wrapped. Data descriptors retain their attributes, and an immutable selected
method is rejected before ordinary prototype methods are changed.

Options are validated and `singular` is captured when wrapping. Own true
`promisified_` / `callbackified_` data flags preserve idempotence; inherited or
accessor flags cannot bypass wrapping. Function metadata such as name, length
and unrelated custom properties is not copied.

All **27 upstream cases** run on both runtimes with original controls. The root
suite adds **22 focused cases**. See [caller checks and test adaptations](../../scripts/cloud-utils-conformance/README.md),
[provenance](PROVENANCE.json), and [paired performance evidence](bench/results/README.md).
