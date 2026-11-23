# vminipass

An independent implementation of the Minipass 7.1.3 stream API used by
VentiMath's file-discovery dependencies. It has no runtime package dependencies;
Node's EventEmitter and StringDecoder supply events and character decoding.

```js
import { Minipass } from 'vminipass';

const paths = new Minipass({ objectMode: true });
const result = paths.collect();
paths.write('src/index.ts');
paths.end('src/app.tsx');
console.log(await result);
```

Byte, encoded-string and object streams support partial reads, synchronous
delivery, pause/resume, pipe/unpipe, backpressure, collectors, promises and sync
or async iteration. `async: true` defers delivery. Abort signals reject pending
consumers and release their listeners. Reentrant endings complete once;
unpipe during a write does not skip another destination. Returning a pending
async iterator resolves its outstanding wait and removes its listeners.

Flowing writes forward their single payload directly to EventEmitter, avoiding
a rest-array/spread wrapper on every chunk. Public event dispatch and subclass
overrides remain intact.

The buffer uses a head cursor with periodic compaction. It does not repeatedly
shift every remaining object during a directory walk. `bufferLength` counts
objects, bytes, or string code units according to the selected mode.

This follows Minipass's synchronous stream contract: `write` reports whether
the stream is flowing. It is not a Node PassThrough with a configurable
high-water mark. `collect` returns the chunks with a `dataLength` property;
`concat` rejects object mode. Encoding and object mode are fixed at construction.
There is no private-symbol `debugExposeBuffer` API. Exact asynchronous microtask
ordering is not promised beyond the tested delivery/completion contracts.

The declarations are independent structural types, including `BufferLike` and
`AbortSignalLike`, so importing the package does not add ambient Node or DOM
types. Runtime byte chunks are Node Buffers. Consumers can supply their concrete
chunk type through the `Minipass<ReadType, WriteType>` generics.

Validation covers 30 unchanged upstream regression files on Node (308 passing
TAP assertions), 50,000 generated operations and 83 checks through unchanged
glob 13.0.6 and path-scurry 2.0.2 callers. Node and Bun run the focused tests,
generated comparisons and callers; fresh/frozen npm and Bun installations run
the same callers against the packed archive. Strict TS7 checks include NodeNext,
Bundler and an environment without ambient platform declarations.

This does not mark glob, path-scurry or the full npm/tar toolchain as rewritten,
nor does it claim an application override. Glob's bundled default entry still
contains its own dependencies; caller tests deliberately use its raw entry and
count replacement constructions.

[Benchmarks](bench/README.md), [conformance](../../scripts/minipass-conformance/README.md)
and [provenance](PROVENANCE.json) record the scope and evidence.
