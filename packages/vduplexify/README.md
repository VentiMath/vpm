# vduplexify

Join independently attached readable and writable streams into one native
Duplex. Targets duplexify **4.1.3**, including the delayed attachment used by
Cloud Storage **8.4.0** and subclassing used by google-gax **6.14.0**.
Supports Node.js 24 and Bun. **Zero runtime dependencies.**

```js
const duplexify = require('vduplexify');
const {PassThrough} = require('node:stream');

const stream = duplexify();
stream.on('data', chunk => console.log(chunk.toString()));
stream.on('error', console.error);
stream.end('queued until attachment');

const transport = new PassThrough();
stream.setWritable(transport);
stream.setReadable(transport);
```

The default ESM import exposes the same factory. `new duplexify(...)` and
`class Proxy extends duplexify {}` are supported. Self-contained TypeScript
declarations describe streams structurally, without requiring ambient Node types.

## API

`duplexify(writable?, readable?, options?)` creates a Duplex whose directions
can be attached independently. `duplexify.obj(...)` enables object mode, retaining
an explicit `highWaterMark`. Options are copied; frozen objects work. Defaults
remain 16 KiB per byte-stream direction and 16 values in object mode. Directional
watermarks and native `readable`, `writable`, `allowHalfOpen`, `decodeStrings`,
and `emitClose` options are supported.

`setWritable(stream)` attaches or replaces a sink and uncorks once. Accepted
bytes remain with the old sink; queued writes proceed to the new sink. Replaced
streams belong to the caller and are not destroyed. `setReadable(stream)` swaps
the source without removing bytes already buffered by the adapter. Native and
legacy pause/resume readable streams are supported. Stream chunk boundaries
are not a framing contract: native `read()` can combine adjacent byte chunks.

Passing `null` or `false` to `setReadable` signals EOF, preserving buffered data.
Passing either to `setWritable` uncorks and ends that direction; writes queued
before attachment are discarded because there is no destination. Omitting a
constructor direction instead leaves it waiting for attachment. Replacing a
readable after EOF or a sink once finalization has started throws; initial
attachment after an early `end()` remains supported.

`cork()` and `uncork()` nest and gate forwarding. The adapter starts corked until
a writable is attached. `preend` fires before ending the sink, and `prefinish`
fires once after sink completion; either phase can cork to delay completion.

`destroy(error?, callback?)` settles pending writes/end callbacks, removes adapter
listeners, and destroys each attached child at most once. An unfinished child's
close emits **`ERR_STREAM_PREMATURE_CLOSE`** on the adapter. Handle stream errors
or use a pipeline. Destruction without an error gives outstanding operation
callbacks `ERR_STREAM_DESTROYED`; it does not add an adapter error event.

Three options control ownership:

- `destroy:false` leaves attached and subsequently supplied children alive.
- `end:false` leaves the sink open when the adapter finishes.
- `autoDestroy:false` disables destruction in response to child errors/early close.
  Errors are still listened for; the caller must decide whether to replace or
  destroy the stream. Explicit `autoDestroy:true` also enables native destruction
  on normal completion. The default destroys on errors but keeps normal completion
  separate, since an uploaded body can finish before its HTTP response arrives.

Function-valued native lifecycle options (`read`, `write`, `writev`, `final`,
`destroy`, `construct`) are rejected: they would replace the adapter's behavior.

## Changes and evidence

Native streams replace `readable-stream`, `inherits`, `end-of-stream`, and
`stream-shift`. The implementation preserves falsy object values in `end()`,
avoids mutating options, reports truncated streams, respects child ownership,
and settles operations that upstream can leave pending during destruction.

The [pinned upstream suite](../../scripts/duplexify-conformance/README.md) runs
all 16 cases on both runtimes. The root tests add lifecycle, buffering, pipeline,
option, and error regressions. Actual Storage downloads/multipart uploads and
google-gax server retry, client writes, bidirectional streams, and cancellation
are checked with upstream controls. These are local caller checks, not a claim
that either complete SDK has been replaced or deployed.

[Benchmarks](bench/results/README.md) retain three independent processes and an
identical-upstream control per runtime, covering construction, transfer,
backpressure, replacement and google-gax bidirectional streams. They report
regressions alongside improvements.

```sh
npm --prefix scripts/duplexify-conformance ci --ignore-scripts
npm --prefix scripts/retry-request-conformance ci --ignore-scripts
node --test packages/vduplexify/test/*.test.cjs
bun test packages/vduplexify/test
node scripts/duplexify-conformance/run.cjs
node scripts/duplexify-conformance/callers.cjs
```

See [PROVENANCE.json](PROVENANCE.json) and [LICENSE](LICENSE).
