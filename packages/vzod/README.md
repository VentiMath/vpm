# vzod

Independent, dependency-free schema validation for VentiMath's forms and
recursive presentation documents. The current compatibility target is Zod
4.6.7; the application's Zod 3.24.3 callers are checked separately.

```js
import { z } from 'vzod';
import { zodResolver } from 'vhookform-resolvers/zod';

const schema = z.object({
  title: z.string().min(1, 'Title required'),
  labels: z.array(z.string()).optional(),
});
const data = schema.parse(input);
const resolver = zodResolver(schema);
```

The verified language covers strings and their length/email/regex checks,
finite numbers and bounds, booleans, literals/enums, objects and extensions,
arrays, unions, string-key records, lazy recursion, unknown values,
optional/nullable/default fields, custom refinements, and transformations.
Synchronous and asynchronous parsing preserve nested issue paths. Types infer
form inputs and transformed outputs, including `z.infer` and `z.ZodTypeAny`.

There is no copied Zod runtime, dependency on upstream Zod, or dynamic code
generation. Typed containers reject cycles and nesting beyond 256 interpreter
levels instead of overflowing the stack. Required properties must be own
properties; inherited values cannot satisfy a schema. Prototype-looking record
keys remain ordinary own data. Parsed typed containers and schema shapes own
their structure; `unknown()` values intentionally retain their identity.

## Compatibility boundaries

- Use `vhookform-resolvers/zod` for forms. Upstream adapters that inspect Zod's
  private `_def` / `_zod` protocol are not supported by this independent engine.
- The app's one-argument `z.record(valueSchema)` shorthand and `required_error`
  / `invalid_type_error` messages remain accepted. Current Zod 4 otherwise
  determines behavior, including Unicode code-point length and defaults inside
  optional fields. In the unchanged app audit, 15 output differences from Zod 3
  were all note schemas receiving their declared default arrays.
- Email acceptance is checked against current Zod, but its diagnostic `pattern`
  contains VPM's independently expressed regex. Error codes and messages follow
  the current target for the tested language.
- Lazy getters resolve once, following Zod 4. Async unions try branches in order
  and stop after success; unused branch callback side effects are not promised.
- This is not the full upstream API: codecs, JSON Schema generation, metadata
  registries, Mini/Core entry points, compiled schemas, discriminated unions,
  tuples, maps/sets, date schemas and specialist string formats remain outside
  scope. Runtime schema construction uses the factories; custom Zod subclasses
  and third-party plugins that inspect internals are outside scope too.

[Conformance](../../scripts/zod-conformance/README.md) covers the unchanged
application schemas and form stack. [Benchmarks](bench/results/README.md) retain
isolated process measurements and controls. Built and tested is distinct from
released or adopted by the app.

## Measured tradeoffs

On Node 24.22.1 / Bun 1.4.4, constructing the tested twenty-field schema takes
about 94% / 87% less time. Invalid-form diagnostic consumption has no established
difference at this precision. Parsing remains a follow-up: valid forms take
1.35 / 1.03 microseconds versus 0.53 / 0.58 upstream (2.56x / 1.78x), and the
recursive document takes 12.53 / 12.88 microseconds versus 3.82 / 5.30
(3.30x / 2.44x paired changes). These are isolated workloads, not application
latency claims. The initial interpreter overhead was reduced without removing
cycle/depth, own-property, error-path or async checks. Remaining traversal costs
are recorded rather than presented as a general performance improvement.
