# vhttp-errors

HTTP error factories and named constructors for Node.js 20+ and Bun. A counterpart
to `http-errors` 2.0.1 with **one runtime dependency, `vstatuses`, instead of five**.
Native prototype operations and local constructor naming replace `inherits`,
`setprototypeof`, and `toidentifier`. Invalid statuses become 500 errors, removing
the deprecated non-error status behavior and its `depd` dependency.

## Use

```js
const createError = require('vhttp-errors');

const missing = createError(404, 'Widget not found');
const limited = new createError.TooManyRequests('Try again later');
const annotated = createError(new Error('Upstream failed'), { expose: false });
console.log(createError.isHttpError(missing)); // true
```

ES modules can use `import createError from 'vhttp-errors'`. TypeScript declarations
include every named/numeric constructor and require no separate types package.

## API

`createError([status], ...details)` accepts a numeric status first, then strings,
Errors, and property objects. Strings supply the message for a newly created
error; an existing Error retains its identity and message. The last property
object is used. A valid status on an existing Error takes precedence over the
numeric argument. Defaults are status 500 and the standard reason phrase.

Named constructors such as `NotFound` and numeric aliases such as `[404]` work
with or without `new`. Standard errors inherit from `HttpError` and `Error`,
with `status`, `statusCode`, and `expose`. Client errors default to exposed;
server errors default to hidden. `HttpError` itself is abstract.

Unknown integer 4xx/5xx codes retain upstream's family constructor behavior;
for example, 499 uses the BadRequest constructor while retaining status 499.
Message/name descriptors and caller-oriented stack traces are preserved.

## Improvements and intentional differences

- Statuses must be integers from 400 to 599. Invalid numeric arguments become
  500; invalid Error statuses can fall back to a valid `statusCode` or the supplied
  numeric argument. Inconsistent `status`/`statusCode` values are synchronized.
- Property copying considers only own enumerable string keys. It ignores
  `__proto__`, `constructor`, `prototype`, `status`, and `statusCode`, without
  evaluating their getters. Other custom properties, including `headers`, `cause`,
  and `expose`, remain available.
- `isHttpError()` requires an Error with a valid matching status pair and boolean
  `expose`, even for instances of the local constructors.
- Subclasses of named constructors retain their own prototype.
- The factory uses a private constructor table. Reassigning an exported
  constructor does not redirect factory calls. Constructor prototypes remain
  ordinary mutable JavaScript objects.
- Factory construction captures the public caller stack once instead of
  recapturing it after invoking a named constructor.

Non-error status deprecation messages and `depd` configuration are no longer
supported. Ordinary application getters and assignment errors still propagate.
The dependency reduction is for this package; other application dependencies
may continue to require those four upstream helpers.

## Validation and performance

Eleven tests compare every standard constructor, numeric/named aliases, ordinary
factory outputs, descriptors, custom statuses, and existing Error identity. They
also cover invalid statuses, inherited/unsafe properties, subclasses, stack
locations, and export mutation. The unchanged upstream fixture uses native
runtime shims, with deprecation output disabled. Fixtures are excluded from packs.

The repository's [integration gate](../../scripts/integration.cjs) aliases this
package into ventimath's pinned Cloud Functions upgrade target (Functions Framework 5.0.2,
firebase-functions 7.4.0, Express 5.3.0, send 1.2.1, serve-static 2.2.1) and runs
real HTTP checks on Node and Bun in CI. It covers JSON body errors, range errors,
thrown HTTP errors with headers, and `vfinalhandler` responses.

From the repository root:

```sh
node packages/vhttp-errors/bench/compare.cjs /path/to/node_modules/http-errors
bun packages/vhttp-errors/bench/compare.cjs /path/to/node_modules/http-errors
```

Without an installed package path, the benchmark uses the fixture/shims described
above. These measurements use the installed full `http-errors` 2.0.1 stack.
One local run on October 26, 2026; **upstream / VPM**, median nanoseconds per call,
seven alternating samples of 50,000 calls after warmup, with results consumed.

| Workload | Node 24.22.1 | Bun 1.4.0 |
| --- | ---: | ---: |
| Factory 404 | 8,501 / 6,634 | 794 / 506 |
| Named constructor | 5,594 / 6,373 | 380 / 530 |
| Factory with properties | 11,985 / 8,742 | 1,076 / 587 |
| Annotate existing Error | 55 / 43 | 38 / 24 |

Factory cases took 22–45% less time, while **direct named constructors took
14–40% more time**. The existing-Error case reuses an Error created outside timing.
These are individual-call measurements, not application latency or throughput;
results vary by runtime and run.

## Install from this repository

Run `bun pm pack` in `packages/vstatuses` and `packages/vhttp-errors`. In the
consuming project's package manifest:

```json
{
  "dependencies": {
    "vhttp-errors": "file:/absolute/path/to/vpm/packages/vhttp-errors/vhttp-errors-0.1.0.tgz"
  },
  "overrides": {
    "vstatuses": "file:/absolute/path/to/vpm/packages/vstatuses/vstatuses-0.1.0.tgz"
  }
}
```

Run `bun install`. Packing converts workspace references to versions; the override
supplies the local dependency archive. VPM has not published these to a registry.

## Origin and license

Derived from [`http-errors` 2.0.1](https://github.com/jshttp/http-errors/tree/61aee5769e92678ff25a2da8e3a2dd1504762432),
by Jonathan Ong and Douglas Christopher Wilson. The source fixture is verified
against that commit. MIT licensed; notices are preserved in [LICENSE](LICENSE).
