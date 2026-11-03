'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..'), temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-query-archives-'));
function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {cwd: temp, env, encoding: 'utf8', timeout: 120000});
  assert.equal(result.status, 0, result.stdout + result.stderr); return result.stdout;
}
try {
  const dependencies = {react: 'file:' + path.join(__dirname, 'node_modules/react')};
  for (const name of ['vtanstack-query-core', 'vtanstack-react-query']) {
    const directory = path.join(root, 'packages', name), metadata = require(path.join(directory, 'package.json'));
    const result = spawnSync('bun', ['pm', 'pack', '--ignore-scripts', '--destination', temp, '--quiet'], {cwd: directory, encoding: 'utf8'});
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const filename = name + '-' + metadata.version + '.tgz';
    dependencies[name] = 'file:' + path.join(temp, filename);
    assert.doesNotMatch(run('tar', ['-tzf', path.join(temp, filename)]), /package\/(build|test|bench)\//);
  }
  fs.writeFileSync(path.join(temp, 'package.json'), JSON.stringify({private: true, dependencies}));
  run('npm', ['install', '--offline', '--ignore-scripts', '--legacy-peer-deps', '--no-audit', '--no-fund', '--cache', path.join(temp, 'cache')]);
  run(process.execPath, ['-e', "const a=require('vtanstack-query-core');import('vtanstack-query-core').then(b=>{if(a.QueryClient!==b.QueryClient)throw Error('split identity');const c=new b.QueryClient();c.setQueryData(['archive'],1);if(c.getQueryData(['archive'])!==1)throw Error('cache');c.clear();});"]);
  console.log(run(process.execPath, [path.join(__dirname, 'application.cjs')], {...process.env, VPM_QUERY_CONSUMER: temp}).trim());
  const {compile, clean} = require('../platform-types.cjs');
  const file = path.join(temp, 'consumer.ts');
  fs.writeFileSync(file, `import {QueryClient, QueryObserver} from 'vtanstack-query-core';
const client = new QueryClient();
const observer = new QueryObserver(client, {queryKey: ['a'], queryFn: async ({signal}) => signal.aborted ? [] : ['a'], select: items => items.length});
const count: number | undefined = observer.getCurrentResult().data;
void count;
// @ts-expect-error query result is a number
const wrong: string = observer.getCurrentResult().data;
`);
  clean(compile({files: [file], compilerOptions: {strict: true, noEmit: true, target: 'ES2022', lib: ['ES2022'], types: [], module: 'NodeNext', moduleResolution: 'NodeNext', skipLibCheck: false}}));
  console.log('Installed archives: CJS/ESM identity, mounted React behavior and strict DOM-free types passed.');
} finally {fs.rmSync(temp, {recursive: true, force: true});}
