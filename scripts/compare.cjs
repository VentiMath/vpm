'use strict';
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');

module.exports = function compare(cases) {
  let checksum = 0;
  function measure(fn, inputs, count) {
    let consumed = 0;
    const start = performance.now();
    for (let i = 0; i < count; i++) {
      const result = fn(inputs[i % inputs.length]);
      consumed += typeof result === 'string' ? result.length : Number(result) || 0;
    }
    const elapsed = performance.now() - start;
    checksum += consumed;
    return elapsed * 1e6 / count;
  }
  const rows = [];
  console.log(`Runtime: ${process.versions.bun ? 'Bun ' + process.versions.bun : 'Node ' + process.version}`);
  console.log('Median nanoseconds/call, 7 samples of 50,000 calls, alternating order.');
  for (const { name, before, after, inputs } of cases) {
    for (const input of inputs) assert.deepEqual(after(input), before(input), name);
    for (const fn of [before, after]) measure(fn, inputs, 10000);
    const samples = [[], []];
    for (let round = 0; round < 7; round++) {
      for (const index of round % 2 ? [1, 0] : [0, 1]) samples[index].push(measure([before, after][index], inputs, 50000));
    }
    const [old, next] = samples.map(values => values.sort((a, b) => a - b)[3]);
    rows.push({ case: name, 'upstream ns': Math.round(old), 'VPM ns': Math.round(next), 'VPM / upstream': (next / old).toFixed(2) });
  }
  console.table(rows);
  console.log(`Checksum: ${checksum}. Microbenchmarks vary with runtime, warmup, and garbage collection.`);
};
