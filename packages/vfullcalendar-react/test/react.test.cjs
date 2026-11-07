'use strict';
// Behavioral checks live in the mounted and real-browser conformance suites.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),provenance=require('../PROVENANCE.json'),metadata=require('../package.json');
test('package metadata: VPM dependencies, React peers, no polyfill', () => {
  assert.equal(metadata.version, provenance.upstream.version);
  assert.deepEqual(metadata.dependencies, {'vfull-ui-headless-calendar': 'workspace:*', 'vfullcalendar-core': 'workspace:*'});
  assert.deepEqual(metadata.peerDependencies, {react: '^17 || ^18 || ^19', 'react-dom': '^17 || ^18 || ^19'});
  assert.equal(metadata.type, 'module');
  assert.equal(metadata.vpm.platform, 'browser');
  assert.deepEqual(metadata.sideEffects, ['**/*.css']);
  for (const [subpath, target] of Object.entries(metadata.exports)) {
    if (subpath.includes('*')) continue;
    for (const file of typeof target === 'string' ? [target] : Object.values(target)) assert.ok(fs.existsSync(path.join(root, file)), subpath + ' ' + file);
  }
});

test('shipped entries exclude the retained upstream renderer',()=>{assert.equal(provenance.implementation.kind,'independent');assert.equal(fs.existsSync(path.join(root,'chunks')),false);assert.ok(metadata.files.includes('src'));for(const file of fs.readdirSync(path.join(root,'src')))assert.doesNotMatch(fs.readFileSync(path.join(root,'src',file),'utf8'),/['"](@fullcalendar\/|@full-ui\/|temporal-polyfill)/);});

test('event replacement keeps separate duplicate-ID occurrences and retires removed keys',async()=>{
 const {CalendarApi}=await import('../src/model.js');
 const data=[{id:'same',start:'2026-11-03',title:'first'},{id:'same',start:'2026-11-04',title:'second'}];
 const api=new CalendarApi({initialDate:'2026-11-03',timeZone:'UTC',events:data});
 const keys=[...api.records.keys()];api.replaceEvents(data.map(event=>({...event})));
 assert.deepEqual([...api.records.keys()],keys);assert.equal(api.getEvents().length,2);
 api.replaceEvents([]);api.replaceEvents(data);assert.notDeepEqual([...api.records.keys()],keys);
});
