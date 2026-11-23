# vsisteransi

Independent terminal cursor, scrolling and erase sequences, matching `sisteransi`
2.0.0 and the 1.0.5 API used by VentiMath's Prompts and Clack build tools. No
runtime dependencies, terminal access or output side effects: every operation
returns a string. CommonJS, ESM and strict TypeScript declarations are included.

```js
import {cursor, erase} from 'vsisteransi';
process.stdout.write(cursor.to(0, 0) + erase.line);
```

`cursor.to(column, row)` uses zero-based coordinates. Explicit row zero emits a
two-dimensional cursor position; omitting the row changes only the column.
Upstream 1.0.5 and 2.0.0 treat zero as an omitted row, contrary to their documented
coordinate system. The regression test keeps both upstream results as evidence.
[Upstream interface](https://github.com/terkelg/sisteransi) and
[XTerm control sequences](https://invisible-island.net/xterm/ctlseqs/ctlseqs.html).

Counts and coordinates must be safe integers; movement accepts signed integers.
Other counts are nonnegative. Operations producing repeated output reject more
than 1,000,000 repetitions, avoiding unbounded allocation and fractional-count
loops. These are deliberate validation differences. Parameterized commands retain
upstream's zero-count bytes; terminals can interpret those as one movement.

`erase.lines` does not rely on a receiver and uses repeated string blocks rather
than a JavaScript loop. The byte contract includes cursor save/restore, scrolling,
line and screen erasure, bell, and the 2.0.0 `clear.screen` reset. Missing move
coordinates default to zero; `erase.lines()` defaults to zero rows.

Verification includes 55,958 valid byte comparisons, four regression tests,
unchanged Prompts select/text/multiselect callers and Clack frame diffs across four
terminal widths. Fresh npm/Bun alias installs rerun the contracts and callers and
compile TypeScript 7 consumers. [Measurements](bench/README.md) use varying inputs,
balanced isolated processes and identical-upstream controls.

Built in VPM; not yet released or adopted by the app. [Provenance](PROVENANCE.json).
