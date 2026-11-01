'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {spawnSync} = require('node:child_process'), {createHash} = require('node:crypto');
const modules = path.join(__dirname, 'node_modules'), root = path.resolve(__dirname, '../..');
function run(upstream, own = false) {
  const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-floating-react-')));
  try {
    fs.mkdirSync(path.join(tmp, 'tests'));
    const provenance = require('./upstream/provenance.json');
    for (const [name, hash] of Object.entries(provenance.sha256)) {
      const source = fs.readFileSync(path.join(__dirname, 'upstream', name + '.txt'));
      if (createHash('sha256').update(source).digest('hex') !== hash) throw Error('Upstream snapshot changed: ' + name);
      if (!name.includes('test-d')) fs.writeFileSync(path.join(tmp, 'tests', name), source);
    }
    if (own) fs.copyFileSync(path.join(__dirname, 'regressions.test.tsx.txt'), path.join(tmp, 'tests/regressions.test.tsx'));
    fs.symlinkSync(modules, path.join(tmp, 'node_modules'), 'dir');
    const alias = [
      {find: 'vfloating-ui-utils/dom', replacement: path.join(root, 'packages/vfloating-ui-utils/dom.mjs')},
      {find: '../src', replacement: path.join(upstream ? modules + '/@floating-ui/react-dom' : root + '/packages/vfloating-ui-react-dom', upstream ? 'dist/floating-ui.react-dom.mjs' : 'runtime.mjs')},
      ...['vfloating-ui-react-dom','vfloating-ui-dom','vfloating-ui-core','vfloating-ui-utils'].map(name => ({find: name, replacement: path.join(root, 'packages', name, 'runtime.mjs')})),
      {find: '@floating-ui/react-dom', replacement: path.join(upstream ? modules + '/@floating-ui/react-dom' : root + '/packages/vfloating-ui-react-dom', upstream ? 'dist/floating-ui.react-dom.mjs' : 'runtime.mjs')},
      {find: 'react', replacement: path.join(modules, 'react')},
      {find: 'react-dom', replacement: path.join(modules, 'react-dom')},
    ];
    fs.writeFileSync(path.join(tmp, 'setup.ts'), `import {afterEach} from 'vitest'; import {cleanup} from '@testing-library/react'; afterEach(cleanup);`);
    fs.writeFileSync(path.join(tmp, 'vitest.config.mjs'), `export default {resolve:{alias:${JSON.stringify(alias)},dedupe:['react','react-dom']},test:{environment:'jsdom',globals:true,include:['tests/*.test.tsx'],setupFiles:['./setup.ts'],server:{deps:{inline:[/@floating-ui[\\\\/]react/]}}}};`);
    const report = path.join(tmp, 'report.json');
    const r = spawnSync(process.execPath, [path.join(modules, 'vitest/vitest.mjs'), 'run', '--root', tmp, '--config', path.join(tmp, 'vitest.config.mjs'), '--reporter=json', '--outputFile='+report], {encoding:'utf8',timeout:90000,env:{...process.env,VPM_ORIGINAL:upstream?'1':'0'}});
    if (!fs.existsSync(report)) throw Error(r.stdout + r.stderr);
    const stats = JSON.parse(fs.readFileSync(report));
    console.log(`${upstream?'Upstream':'VPM'}: ${stats.numPassedTests}/${stats.numTotalTests} tests passed`);
    if (r.status !== 0 || !stats.numTotalTests) throw Error(JSON.stringify(stats.testResults.filter(x=>x.status!=='passed'),null,2) + r.stderr);
  } finally {fs.rmSync(tmp,{recursive:true,force:true});}
}
for (const original of [true,false]) run(original, true);
