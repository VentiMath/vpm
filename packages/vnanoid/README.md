# vnanoid

Independent compact identifiers targeting Nano ID 6.0.2. Secure generation uses
Node/Bun cryptography or browser Web Crypto, with no weak-random fallback. The
explicit `vnanoid/non-secure` entry uses `Math.random` for non-security labels.

```js
import { nanoid, customAlphabet } from 'vnanoid';
const id = nanoid(); // 21 URL-safe characters
const hex = customAlphabet('0123456789abcdef', 32);
hex();
```

Exports `nanoid`, `customAlphabet`, `customRandom`, `random` and `urlAlphabet`;
CommonJS and ESM expose the same API. The non-secure entry exports `nanoid` and
`customAlphabet`. Modern browser bundlers select the Web Crypto entry.

VentiMath's PostCSS 8.5.8 calls `non-secure.nanoid(6)` to name anonymous CSS
inputs. Conformance tests run that unchanged parser with VPM installed at the
dependency boundary, alongside Nano ID 6.0.2 and the app's 3.3.11 control. Built
and tested does not mean released or adopted by the app.

## Boundaries and deliberate differences

Sizes must be integer numbers from zero through 1,048,576. Alphabets contain
1–256 non-surrogate UTF-16 characters; repeated characters are permitted but
reduce effective entropy. Invalid values fail explicitly instead of coercing,
allocating unbounded memory or hanging. Zero-length custom IDs return `''`;
the app's 3.3.11 control hangs for that case in a timeout-isolated probe.

Custom sources must return exactly the requested unsigned byte array. Sources
that supply only rejected bytes for 1,024 consecutive calls throw. Custom
random sequences are intentionally not byte-for-byte compatible with upstream;
the distribution is unbiased for uniformly random bytes. A custom source is
only as secure as the bytes it supplies. Tests check mapping and byte ownership,
not cryptographic certification or a proof of collision resistance.

Returned `random()` arrays own their bytes: later generation cannot mutate them.
The internal entropy pool is private. CLI and legacy-runtime shims are outside
this module contract. No upstream runtime code ships.

[Benchmarks](bench/results/README.md) use isolated, balanced processes on Node 24
and Bun 1.4.4, with current and app-pinned controls. They measure ID generation,
not end-to-end CSS build time.


The non-secure implementation preserves one fresh `Math.random()` draw per
character and the same alphabet mapping. PostCSS's six-character path avoids
the generic alphabet closure and loop; the general path retains strict size
validation. No entropy is pooled or reused in the non-secure API. The secure
implementation remains unchanged.

[Current upstream comparisons](bench/results/README.md) do not establish a
remaining non-secure regression or a speedup beyond the control spread.
[Direct before/after measurements](bench/non-secure/README.md) show 5–7% less
time than our previous implementation on Node and Bun. That control loads the
pinned historical source from Git and verifies its SHA-256; it does not commit
another runtime copy. Generator construction and secure pool initialization
remain outside these steady-state measurements. These checks support the
independent implementation; they are not application speed guarantees.
