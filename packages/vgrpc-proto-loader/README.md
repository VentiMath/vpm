# vgrpc-proto-loader

The runtime loading API of **@grpc/proto-loader 0.8.1**, built on `vprotobufjs`,
`vlong` and `vlodash.camelcase`. It turns `.proto` files, protobuf JSON schemas
and descriptor sets into definitions consumed by gRPC and Google SDKs.
Node 24 and Bun are supported, with CommonJS, native ESM named imports and
self-contained TypeScript declarations.

```js
import {loadSync} from 'vgrpc-proto-loader';

const definition = loadSync('service.proto', {
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
  includeDirs: ['protos'],
});
// Pass definition to grpc.loadPackageDefinition(definition).
```

CommonJS uses `require('vgrpc-proto-loader')`. The public exports are `load`
(Promise), `loadSync`, `fromJSON`, `loadFileDescriptorSetFromBuffer`,
`loadFileDescriptorSetFromObject`, `isAnyExtension`, `IdempotencyLevel` and `Long`.
The last export is the same `vlong` constructor used by the protobuf runtime.
Standard parse/conversion options and include-directory lookup are retained.
Serializers return Node Buffers; byte inputs also accept `Uint8Array` views.

The separate `proto-loader-gen-types` CLI is **not included**. Google SDK runtime
loading does not need it or its `yargs` dependency. This package is a replacement
for runtime callers, not the complete upstream distribution's build tools.

## Changes

- Descriptor export already visits every message. VPM reuses those private
  descriptors and per-type serializer functions during that load, avoiding
  repeated work for request/response types shared by many methods. Public
  descriptor objects remain separately mutable. Nothing is cached across loads.
- Namespace traversal avoids intermediate arrays and concatenation. Redundant
  explicit resolution passes and copies of already-allocated descriptor Buffers
  are removed. Method aliases use `vlodash.camelcase`.
- A parsed method option named `__proto__` becomes an own data property.
  Upstream assigns through the legacy setter and changes the options object's
  prototype. Other option names and values retain upstream behavior.
- `isAnyExtension` accepts an unknown value and returns false for null and
  primitives, instead of throwing. It retains upstream recognition of inherited
  string `@type` properties; this is a type guard, not a trust check.

The protobuf engine moves from upstream's **7.6.6** fixture resolution to
**vprotobufjs based on 8.8.1**. Its descriptor-map import fixes and defensive
reader checks are inherited. Descriptor metadata follows version 8, so it is not
promised to be byte-identical to version 7. A control using the original loader
on protobuf 8 produces identical public descriptor data, including Firestore's
full schema. Selected message wire bytes match the stock version-7 stack.
See [vprotobufjs](../vprotobufjs/README.md) for its compatibility limits.

## Verification

- 18 focused tests cover runtime exports, file/JSON/descriptor loading, conversion
  options, int64 values, byte views, nested types, four RPC modes, descriptor
  mutation isolation and error paths.
- All eight upstream runtime tests run on Node 24 and Bun without assertion
  changes or skips. Their source hashes and license are retained. A temporary
  import-only adaptation keeps the old callable `assert` import working with
  TypeScript 7; the CLI generator suite is outside this package.
- 185 comparison groups cover 36 conversion-option combinations, full Firestore
  descriptor data and four `.proto` files. Stock controls reproduce prototype
  mutation, unsafe type narrowing and the protobuf-7 descriptor-map failure.
- Actual gRPC clients exchange eight calls with upstream endpoints across unary,
  client-streaming, server-streaming and bidirectional modes. Real google-gax
  6.14.0 loads JSON and files; Firestore 9.4.0's generated client executes
  `getDocument`, `batchGetDocuments` and `write` against a local server. Both
  upstream and VPM pass. These checks require no cloud access or credentials.
- Installed npm/Bun archives verify CJS/ESM imports and TypeScript 7 consumers.
  Public types compile without ambient Node, Undici or DOM declarations; native
  Buffer types are inferred when the consumer supplies Node declarations.

The [fixture guide](../../scripts/grpc-loader-conformance/README.md) gives commands
and exact scope. [Paired benchmarks](bench/results/README.md) show forced Firestore
loading through gax taking **28% less time on Node 24 and 27% less on Bun**.
Direct full-schema loading improves 33% and 30%; the original-loader/protobuf-8
control still shows 19% and 20% gains. Node async-file loading and Bun serialization
are inconclusive against control variation. These are loading/codec measurements,
not cloud-request latency claims.
[Provenance](PROVENANCE.json) records the upstream version, source hashes and
changes. The upstream Apache-2.0 [license](LICENSE) is retained. Tests, upstream
fixtures and benchmark reports are excluded from published archives.
