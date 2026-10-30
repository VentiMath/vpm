# vstream-events

One-time `reading` and `writing` notifications for Node streams. Replaces
`stream-events` 1.0.5 with no external dependencies, including no `stubs`.
Supports Node.js 24+ and Bun; performance work targets Node 24 and Bun.

```js
const streamEvents = require('vstream-events');
const {PassThrough} = require('node:stream');

const stream = streamEvents(new PassThrough());
stream.once('reading', size => {
  // The stream's first _read(size) has returned.
});
stream.once('writing', (chunk, encoding, callback) => {
  // The first _write(...) call has returned, possibly before its callback runs.
});
```

Native ESM uses `import streamEvents from 'vstream-events'`. The decorator returns
the same object and preserves its TypeScript type. Constructor-style
`streamEvents.call(this)` is supported. Readable-only and writable-only objects
are supported when they provide a callable `emit` and at least one data method,
`_read` or `_write`.

## Behavior and compatibility

Each decoration observes the first call in each direction independently. The
original method runs first; the event then receives its original arguments.
The wrapper preserves the method's exact return value and call receiver.
These are notifications of a method invocation, not completion of an entire
read, write or request.

Upstream shares a mutable call counter between the two hooks, so one direction
can continue emitting after its first call. A listener also makes upstream
replace the original method's result with `emit()`'s boolean result. VPM fixes
both behaviors. Hooks are consumed and original functions restored before user
code runs, preventing duplicate notifications from reentrant methods or event
listeners. A retained wrapper remains once-only and does not overwrite a method
the application has subsequently replaced.

Explicitly decorating an object again arms another pair of observations, as
upstream does. This is not an idempotent registration API. A thrown method
consumes its hook and emits no notification; a thrown event listener propagates
without rearming the hook.

Both directions are validated before installation. Accessor methods, nonfunction
values and methods that cannot be replaced are rejected. An absent or `undefined`
method is allowed if the other direction is valid. An inherited method needs an
extensible target and a writable prototype descriptor. If the second installation
fails, the first is rolled back on ordinary objects.

Existing own method attributes are retained. Inherited methods become own slots
and are restored to the original function, rather than a permanently bound
function. Prototype lookup is not restored. If the object is frozen after
decoration, an inert once-only wrapper remains because its slot cannot be
restored. No public metadata properties are added.

## Verification and performance

The package has 21 focused tests covering both directions, native streams,
reentrancy, exceptions, descriptors, method replacement and validation rollback.
The [upstream fixture](../../scripts/stream-events-conformance/README.md) runs all
four original tests against both implementations and independently reproduces
the counter and return-value bugs. Current teeny-request 11.1.1, Cloud Storage
8.4.0 and google-gax 6.14.0 caller paths are checked with local fixtures.

```sh
node --test packages/vstream-events/test/*.test.cjs
bun test packages/vstream-events/test
node scripts/stream-events-conformance/run.cjs
node scripts/stream-events-conformance/callers.cjs
node packages/vstream-events/bench/summarize.cjs --verify-current
```

See [benchmark measurements and controls](bench/results/README.md) for setup,
first-use, stream processing and HTTP costs on Node 24 and Bun. These tests do
not establish an application-wide throughput improvement or cloud deployment.

## Provenance and license

MIT. [PROVENANCE.json](PROVENANCE.json) pins the comparison tarball, source commit
and the later commit containing upstream's explicit license. The 1.0.5 manifest
already declares MIT. The upstream notice is retained in [LICENSE](LICENSE).
