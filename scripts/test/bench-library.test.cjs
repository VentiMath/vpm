'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {load} = require('../bench-library.cjs');
test('benchmark coordinator loads neither implementation; workers load only their assigned library', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-bench-loader-'));
  const saved = process.env.VPM_BENCH_WORKER;
  try {
    delete process.env.VPM_BENCH_WORKER;
    const forbidden = () => {throw new Error('unselected implementation was loaded');};
    assert.deepEqual(await load({upstream: forbidden, vpm: forbidden}), {});
    const file = path.join(directory, 'request.json');
    process.env.VPM_BENCH_WORKER = file;
    for (const library of ['upstream', 'vpm']) {
      fs.writeFileSync(file, JSON.stringify({library}));
      assert.deepEqual(await load({upstream: forbidden, vpm: forbidden, [library]: async () => 42}), {[library]: 42});
    }
    fs.writeFileSync(file, JSON.stringify({library: '__proto__'}));
    await assert.rejects(load({upstream: forbidden, vpm: forbidden}), /Unknown benchmark library/);
  } finally {
    if (saved === undefined) delete process.env.VPM_BENCH_WORKER; else process.env.VPM_BENCH_WORKER = saved;
    fs.rmSync(directory, {recursive: true, force: true});
  }
});
