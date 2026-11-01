'use strict';
const fs = require('node:fs'), path = require('node:path');
const {verify} = require('./bench-process.cjs');
const root = path.resolve(process.argv[2] ?? '.');
const name = JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).name;
const reports = ['node', 'bun'].map(runtime => {
  const file = `${runtime}-isolated.json`;
  const report = JSON.parse(fs.readFileSync(path.join(root, 'bench/results', file)));
  verify(report, root);
  return {file, report};
});
const lines = [`# ${name} measurements`, '',
  'Each timed',
  'implementation runs alone in a fresh process. Four comparison pairs use',
  'balanced upstream-first / VPM-first order; two further pairs run identical',
  'upstream code in separate processes as controls. Warmup lasts at least 150 ms',
  'per case, followed by recalibration on warmed code, four warmup blocks and 12',
  'recorded blocks. Both workers in a pair use the same iteration count, targeting',
  '10 ms blocks with a one-million-operation cap. Results are retained and checked',
  'outside timing. All samples are kept, including outliers.', '',
  'The comparison units are per-process medians. The change column is the median',
  'of four process-pair percentage changes; the two order columns expose order',
  'sensitivity. The nanosecond columns are medians of the four process medians.',
  'They need not produce exactly the percentage in the change column.', '',
  'A direction is unestablished when it reverses across processes or any pair',
  'overlaps the largest absolute control difference (with a minimum 2% floor).',
  'This is a conservative descriptive check, not a confidence interval. Process',
  'isolation reduces shared JIT feedback; environmental noise and GC remain.',
  'Negative changes mean less time; these are local CPU measurements, not',
  'application throughput or latency guarantees.', ''];
for (const {file, report} of reports) {
  const runtime = report.runtime.bun ? `Bun ${report.runtime.bun}` : `Node ${report.runtime.node}`;
  lines.push(`## ${runtime}`, '', `Recorded ${report.recordedAt} on ${report.cpu}, ${report.platform}/${report.arch}.`, '',
    `[Raw samples, processes, controls and source hashes](${file}).`, '',
    '| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |');
  for (const row of report.summary) lines.push(`| ${row.case.replaceAll('|', '\\|')} | ${row.upstream_ns} | ${row.vpm_ns} | ${row.change_pct}% | ${row.upstream_first_pct}% | ${row.vpm_first_pct}% | ${row.control_max_abs_pct}% | ${row.evidence} |`);
  lines.push('');
}
lines.push('## Reproduce', '', 'Run these commands from the repository root after installing the pinned',
  'fixtures used by `bench/compare.cjs`:', '', '```sh',
  `OUTPUT=packages/${name}/bench/results/node-isolated.json node packages/${name}/bench/compare.cjs`,
  `OUTPUT=packages/${name}/bench/results/bun-isolated.json bun packages/${name}/bench/compare.cjs`,
  `node scripts/render-bench-report.cjs packages/${name}`, '```', '',
  'The renderer verifies the source hashes and recording structure before writing',
  'this page. File hashes are SHA-256; directory hashes cover a sorted recursive',
  'name/hash manifest. Historical reports remain in repository history.', '');
fs.writeFileSync(path.join(root, 'bench/results/README.md'), lines.join('\n'));
console.log(`${name}: verified both runtime recordings and rendered the report`);
