'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {loadModule, load, filesystem, currentControl} = require('./load.cjs');
const vpm = path.join(process.env.VPM_DOCKER_PACKAGE || path.resolve(__dirname, '../../packages/vis-docker'), 'index.cjs');
const current = currentControl();
const legacy = path.join(__dirname, 'node_modules/is-docker-app/index.js');
const wslFile = path.join(__dirname, 'node_modules/is-wsl/index.js');
const openFile = path.join(__dirname, 'node_modules/open/index.js');
const metadata = require('./callers.json');
for (const [name, hash] of Object.entries(metadata.sha256)) assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'node_modules', name))).digest('hex'), hash);

async function observe(dockerFile, scenario) {
  const trace = [];
  const fsProbe = filesystem(scenario.entries);
  const processStub = {platform: scenario.platform, arch: 'x64', env: {SYSTEMROOT: 'C:\\Windows'}, versions: {}};
  const detect = load(dockerFile, fsProbe.stub);
  const wslFs = {...fsProbe.stub, readFileSync(file, encoding) {
    if (file === '/proc/version') return scenario.procVersion || '';
    return fsProbe.stub.readFileSync(file, encoding);
  }};
  const isWsl = loadModule(wslFile, {os: {release: () => scenario.release}, fs: wslFs, 'is-docker': detect}, processStub);
  const opener = loadModule(openFile, {
    'is-docker': detect,
    'is-wsl': isWsl,
    fs: {constants: fs.constants, promises: {
      access: async () => {throw Object.assign(new Error('not present'), {code: 'ENOENT'})},
      readFile: async () => {throw new Error('unexpected read')},
    }},
    child_process: {spawn(command, args, options) {
      trace.push({command, args: [...args], options: JSON.parse(JSON.stringify(options))});
      return {unref() {trace.push('unref')}};
    }},
  }, processStub);
  await opener('https://ventimath.org/');
  return {isWsl, trace: JSON.parse(JSON.stringify(trace))};
}

(async () => {
  const scenarios = [
    {name:'macOS', platform:'darwin', release:'24.0', entries:{}},
    {name:'Windows', platform:'win32', release:'10', entries:{}},
    {name:'Linux host', platform:'linux', release:'6.12', entries:{}},
    {name:'WSL release', platform:'linux', release:'5.15-Microsoft', entries:{}},
    {name:'WSL proc version', platform:'linux', release:'6.12', procVersion:'Microsoft WSL2', entries:{}},
    {name:'WSL with Docker marker', platform:'linux', release:'Microsoft', entries:{'/.dockerenv':''}},
    {name:'WSL with Docker cgroup', platform:'linux', release:'Microsoft', entries:{'/proc/self/cgroup':'0::/docker/id'}},
    {name:'WSL with mountinfo-only Docker', platform:'linux', release:'Microsoft', entries:{'/proc/self/cgroup':'0::/', '/proc/self/mountinfo':'/docker/containers/id/hostname'}},
    {name:'unreadable Docker evidence', platform:'linux', release:'Microsoft', entries:{'/.dockerenv':new Error('EACCES'), '/proc/self/cgroup':new Error('EACCES')}},
  ];
  for (const scenario of scenarios) {
    const actual = await observe(vpm, scenario);
    assert.deepEqual(actual, await observe(current, scenario), scenario.name);
    if (scenario.name.includes('mountinfo-only')) {
      const old = await observe(legacy, scenario);
      assert.equal(old.isWsl, true);
      assert.match(old.trace[0].command, /powershell.exe$/);
      assert.equal(actual.isWsl, false);
      assert.equal(actual.trace[0].command, 'xdg-open');
    } else assert.deepEqual(actual, await observe(legacy, scenario), scenario.name);
    assert.equal(actual.trace.length, 2);
    assert.equal(actual.trace[1], 'unref');
  }
  console.log(`${scenarios.length} unchanged open 8.4.2 / is-wsl 2.2.0 caller scenarios pass; subprocess launches are intercepted.`);
})().catch(error => {console.error(error); process.exitCode = 1});
