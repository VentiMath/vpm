# XML parser comparison fixtures

Pinned **fast-xml-parser 5.11.2** at
`80e88a848b073fd630bc181291a24922c6d1e839`, with its six current helper versions
locked independently. Runtime packages never ship these fixtures.

`upstream/` retains the stable parser/validator sources, original declarations,
MIT license, all 27 top-level spec files and 13 small referenced/example assets.
Files have trailing blank space normalized only at EOF; `SHA256.json` verifies
these snapshots. The runner also checks installed source equality. Experimental
v6/CLI code and large assets are outside this retained library suite.

```sh
npm --prefix scripts/xml-parser-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/xml-parser-conformance/run.cjs --upstream
node scripts/xml-parser-conformance/run.cjs
node scripts/xml-parser-conformance/regressions.cjs
node scripts/xml-parser-conformance/callers.cjs --upstream
node scripts/xml-parser-conformance/callers.cjs
node scripts/xml-parser-conformance/bundles.cjs
```

The same commands run under Bun. A small assertion-backed Jasmine adapter strips
imports, supplies the selected implementations and reads retained asset text.
Test bodies and expected results are unchanged. Both disabled `xit` cases execute.
There are 331 executed cases: upstream has 329 unchanged passes and two disabled
failures; VPM has 322 unchanged passes, seven explicit validation differences and
the same two disabled diagnostics. Every expected failure is identified by exact
file/title and a checked diagnostic; any other failure rejects the gate.

The seven differences are:

- `attr_spec`: a stray equals sign gets an invalid-attribute diagnostic immediately.
- `data_spec` and `entities_spec`: malformed `&ampbar&apos;` in an attribute fails
  requested validation instead of being treated as valid XML.
- `validator_spec`: unclosed comments and unknown declarations get specific errors;
  the ampersand case rejects invalid numeric references.
- `valueProcessors_spec`: validation rejects the same malformed attribute reference
  after its permissive parse and custom-decoder assertions have run.

The disabled external-entity case assumes an exception for `#xD` at parsing; current
upstream does not throw, while VPM rejects the name at registration. The disabled
string-output case calls the removed `prettifyString` method on both versions.
`large_spec` requires an unretained 102 MB file and is the one omitted case. Focused
coverage instead validates and parses a generated >1 MB document plus 100,000
spaces before a malformed attribute.

`regressions.cjs` checks 35 concrete behavior differences against published upstream.
`callers.cjs` substitutes the actual Storage 8.4.0 XML dependency, executes three
multipart uploads with string/Buffer/sliced Buffer initiation responses, and
checks 12 requests, chunk MD5 values and escaped completion XML. Transport is
mocked; no credentials, cloud requests or deployment are involved.
`bundles.cjs` checks published CJS/source ESM parity on seven selected cases and
VPM export identity. It also executes a minified browser-target bundle in an
isolated VM with TextEncoder/TextDecoder and no Node globals. A literal-import
packaging fix in vis-unsafe allows its contexts to be included. This is not a full
real-browser compatibility suite or complete upstream bundle-equivalence claim.

See the [package README](../../packages/vfast-xml-parser/README.md) for scope,
[tests](../../packages/vfast-xml-parser/test/parser.test.cjs) for focused checks,
and [measurements](../../packages/vfast-xml-parser/bench/results/README.md) for
methodology, source hashes and raw results.
