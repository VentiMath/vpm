# vyocto-queue

A small FIFO queue targeting **yocto-queue 1.2.2**, with no runtime dependencies.
Verified on Node.js 24 and Bun. CommonJS and native ESM imports expose the same class.

```js
import Queue from 'vyocto-queue';
const queue = new Queue();
queue.enqueue('first');
queue.enqueue('second');
console.log(queue.peek()); // first, without removal
console.log([...queue.drain()]); // first, second; queue is now empty
```

`enqueue(value)` appends any JavaScript value. `dequeue()` removes the oldest;
`peek()` reads it. Both return `undefined` when empty, so use the read-only `size`
when an actual queued value may be `undefined`. `clear()` discards all entries.
Enqueue and dequeue are constant-time linked-list operations; neither shifts an
array. The queue releases its tail reference when the last entry is removed,
as current upstream already does.

Iteration is lazy and non-destructive. An iterator that has started follows its
original links, including entries appended to that chain; clearing the queue does
not erase the chain held by an existing iterator. `drain()` removes one entry per
advance and can be stopped early. Avoid adding work indefinitely while draining.

The constructor initializes private state directly, so subclass `clear()` overrides
are not invoked before subclass initialization. Other behavior matches the current
queue API. TypeScript supports both `import Queue from 'vyocto-queue'` and
`import Queue = require('vyocto-queue')`, with generic element types.

Eight focused tests cover model-based FIFO behavior, falsy values, live iteration,
early draining, subclass construction and large queues. All seven retained upstream
runtime cases also pass on both runtimes. A separate 24-task caller check runs
unmodified p-limit 3.1.0 with only its old queue dependency replaced. The [conformance fixture](../../scripts/queue-limit-conformance/README.md)
records source hashes, controls and adaptations. See the
[paired benchmarks](bench/results/README.md) for measurements and uncertainty.

MIT; upstream attribution and origins are in [LICENSE](LICENSE) and
[PROVENANCE.json](PROVENANCE.json).
