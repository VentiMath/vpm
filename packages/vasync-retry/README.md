# vasync-retry

Promise retries targeting **async-retry 1.3.3**, the stable upstream release
checked on October 30, 2026. Its only dependency is [`vretry`](../vretry), replacing
upstream's retry 0.13.1. Verified on Node.js 24 and Bun, including actual Google
Cloud Storage 8.4.0 multipart caller methods.

```js
import retry from 'vasync-retry';
const result = await retry(async (bail, attempt) => {
  const response = await fetch('https://example.com/data');
  if (response.status === 403) {
    bail(new Error('Access denied'));
    return;
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}, {retries: 3, minTimeout: 100, maxTimeout: 1000});
```

`require('vasync-retry')` returns the same function. Bundled types infer the
resolved task value and accept synchronous values, promises and thenables.

## Upstream baseline and fixes

| Behavior in async-retry 1.3.3 | VPM behavior |
| --- | --- |
| Writes `randomize` into the caller's options; frozen options reject. | Snapshots own options and applies defaults privately. |
| `bail()` rejects the outer promise but a later task rejection can still schedule retries. | Settlement is terminal and cancels pending retry timers. Later task results remain observed. |
| Falsy rejection reasons can throw during error handling or leave work unsettled. | Wraps falsy failures in an Error with code `ERR_FALSY_REJECTION` and the original `cause`, then applies the retry policy. |
| Errors from `onRetry` can escape the retry lifecycle. | A synchronous throw or rejected hook settles the operation and cancels pending retries. |
| Inherits retry's timer, reset and error-message accounting problems. | Uses the fixes documented in `vretry`, including zero budgets and reserved error messages. |

The [conformance fixture](../../scripts/retry-conformance/README.md) includes
upstream controls proving the option-mutation and post-bail differences. Separate
focused tests cover malformed task results, hooks and terminal cleanup.

## Behavior and limits

`retry(task, options?)` calls `task(bail, attempt)` immediately with attempt 1.
A returned value resolves the promise; throws and rejections follow the retry
schedule. Exhaustion rejects with the most frequent failure, preferring the latest
tie. `bail(error)` and errors with a truthy `.bail` property stop retries.
An omitted or falsy bail reason becomes `Error('Aborted')`, as upstream does.

Options are [`vretry` options](../vretry/README.md#api-and-intentional-differences),
except that randomization defaults to **true**, matching async-retry. Invalid
configuration rejects through the promise API. `onRetry(error, attempt)` runs only
when a retry is scheduled and receives the failed attempt's number. Returned
thenables are observed for rejection, but a pending hook does not delay the next
attempt. Once the task has settled, later hook failures cannot change its result.

`bail` cannot interrupt task code or active I/O: return after calling it and use
application cancellation where necessary. `maxRetryTime` controls whether a new
backoff delay fits the remaining budget; it is not a hard request deadline.
`unref` permits process exit while a retry is pending. Retries must be safe for
the operation being performed; this package does not provide idempotency.

## Evidence and performance

Fifteen focused tests and **all nine retained upstream cases** pass on both
runtimes. Actual Storage 8.4.0 methods execute **15 retry operations / 21 attempts**
covering multipart initiation, parts, completion, abort, exhausted/fatal failures,
resumption and disabled retries. Original async-retry controls execute the same
paths. Cloud boundaries are local doubles; this is not a live cloud deployment.

The fixture records two existing Storage issues: immediate part rejection can
precede batch error observation, and resumed uploads restart part numbering.
Neither is repaired by replacing the retry package. The caller tests document
these boundaries instead of claiming full multipart-upload correctness.

[Paired measurements](bench/results/README.md) retain raw samples and source
hashes, including regressions and the timer-dominated case. Local scheduling
savings do not imply a comparable improvement in network latency.

MIT. Exact source, package integrity and changes are in
[PROVENANCE.json](PROVENANCE.json); attribution is retained in [LICENSE](LICENSE).
