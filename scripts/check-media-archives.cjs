'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root, compiler } = require('./platform-types.cjs');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-media-archives-'));
function run(command, args, cwd = directory) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout.slice(0, 8000)}\n${result.stderr.slice(0, 2000)}`);
  return result.stdout;
}
try {
  const dependencies = {};
  const runtimePackages = fs.readdirSync(path.join(root, 'packages')).filter(name => require(path.join(root, 'packages', name, 'package.json')).vpm?.kind !== 'types');
  for (const name of runtimePackages) {
    run('bun', ['pm', 'pack', '--ignore-scripts', '--destination', directory, '--quiet'], path.join(root, 'packages', name));
    const version = require(path.join(root, 'packages', name, 'package.json')).version;
    const archive = name + '-' + version + '.tgz';
    assert.ok(fs.existsSync(path.join(directory, archive)), name);
    const packed = path.join(directory, archive);
    dependencies[name] = 'file:' + packed;
    const metadata = JSON.parse(run('tar', ['-xOf', packed, 'package/package.json']));
    for (const version of Object.values(metadata.dependencies || {})) assert.equal(version, '0.1.0');
    if (name === 'vnode-fetch' || name === 'vgaxios') {
      assert.deepEqual(Object.keys(metadata.dependencies).sort(), name === 'vnode-fetch' ? ['viconv-lite'] : ['vextend','vhttps-proxy-agent','vnode-fetch']);
      assert.doesNotMatch(run('tar', ['-tzf', packed]), /\/(?:test|bench|node_modules)\//);
    }
    if (name === 'vgoogle-auth-library') {
      assert.deepEqual(Object.keys(metadata.dependencies).sort(), ['vgaxios','vgcp-metadata','vgoogle-logging-utils','vjws']);
      assert.doesNotMatch(run('tar', ['-tzf', packed]), /\/(?:test|bench|node_modules)\//);
    }
    if (name === 'vgcp-metadata') {
      assert.deepEqual(metadata.dependencies, {vgaxios:'0.1.0','vgoogle-logging-utils':'0.1.0','vjson-bigint':'0.1.0'});
      assert.doesNotMatch(run('tar', ['-tzf', packed]), /\/(?:test|bench|node_modules)\//);
    }
    if (name === 'vgtoken') {
      assert.deepEqual(metadata.dependencies, {vgaxios: '0.1.0', vjws: '0.1.0'});
      assert.doesNotMatch(run('tar', ['-tzf', packed]), /\/(?:test|bench|node_modules)\//);
    }
    if (name === 'vuuid') {
      assert.equal(metadata.dependencies,undefined);
      assert.equal(metadata.bin.vuuid,'bin/vuuid.cjs');
      assert.doesNotMatch(run('tar',['-tzf',packed]),/\/(?:test|bench|node_modules)\//);
    }
    if (['vobject-hash','vyocto-queue','vpromisify','vprojectify','vduplexify','vstream-events','vretry-request','vextend','vis-stream','vgoogle-logging-utils','vjson-bigint'].includes(name)) {
      assert.equal(metadata.dependencies, undefined);
      const entries=run('tar',['-tzf',packed]).trim().split('\n').filter(f=>!f.endsWith('/')).map(f=>f.replace(/^package\//,''));
      assert.deepEqual(entries.sort(),['LICENSE','README.md','PROVENANCE.json','index.js','index.d.ts','package.json'].sort());
    }
    if (name === 'vgoogle-cloud-storage') {
      assert.deepEqual(Object.keys(metadata.dependencies).sort(), ['vasync-retry','vduplexify','vfast-xml-parser','vgaxios','vgoogle-auth-library','vhtml-entities','vmime','vp-limit','vpaginator','vprojectify','vpromisify','vretry-request','vteeny-request']);
      const entries=run('tar',['-tzf',packed]).trim().split('\n').filter(f=>!f.endsWith('/')).map(f=>f.replace(/^package\//,''));
      const library=fs.readdirSync(path.join(root,'packages/vgoogle-cloud-storage/lib'),{recursive:true}).filter(f=>fs.statSync(path.join(root,'packages/vgoogle-cloud-storage/lib',f)).isFile()).map(f=>'lib/'+f);
      assert.deepEqual(entries.sort(),['LICENSE','README.md','PROVENANCE.json','package.json','index.js','index.mjs','index.d.ts','index.d.mts',...library].sort());
      assert.doesNotMatch(entries.join('\n'), /(?:test|bench|node_modules)\//);
    }
    if (name === 'vmime') {
      assert.equal(metadata.dependencies, undefined);
      assert.equal(metadata.bin.vmime,'bin/vmime.cjs');
      const entries=run('tar',['-tzf',packed]).trim().split('\n').filter(f=>!f.endsWith('/')).map(f=>f.replace(/^package\//,''));
      assert.deepEqual(entries.sort(),['LICENSE','README.md','PROVENANCE.json','package.json','lib/Mime.js','bin/vmime.cjs',...['index','lite','types/standard','types/other'].flatMap(n=>[n+'.js',n+'.mjs',n+'.d.ts',n+'.d.mts'])].sort());
    }
    if (name === 'vfast-xml-parser') {
      assert.deepEqual(Object.keys(metadata.dependencies).sort(),['vfast-xml-builder','vis-unsafe','vnodable-entities','vpath-expression-matcher','vstrnum','vxml-naming']);
      const entries=run('tar',['-tzf',packed]).trim().split('\n').filter(f=>!f.endsWith('/')).map(f=>f.replace(/^package\//,''));
      assert.deepEqual(entries.sort(),['LICENSE','README.md','PROVENANCE.json','index.js','index.mjs','index.d.ts','index.d.mts','package.json','lib/ignoreAttributes.js','lib/util.js','lib/validator.js',...['DocTypeReader','OptionsBuilder','OrderedObjParser','XMLParser','node2json','xmlNode'].map(n=>'lib/xmlparser/'+n+'.js')].sort());
    }
    if (name === 'vfast-xml-builder') {
      assert.deepEqual(Object.keys(metadata.dependencies).sort(),['vpath-expression-matcher','vxml-naming']);
      const entries=run('tar',['-tzf',packed]).trim().split('\n').filter(f=>!f.endsWith('/')).map(f=>f.replace(/^package\//,''));
      assert.deepEqual(entries.sort(),['LICENSE','README.md','PROVENANCE.json','index.js','index.mjs','index.d.ts','index.d.mts','package.json','lib/fxb.js','lib/orderedJs2Xml.js','lib/options.js','lib/util.js','lib/ignoreAttributes.js'].sort());
    }
    if (name === 'vnodable-entities') {
      assert.equal(metadata.dependencies, undefined);
      const entries=run('tar',['-tzf',packed]).trim().split('\n').filter(f=>!f.endsWith('/')).map(f=>f.replace(/^package\//,''));
      assert.deepEqual(entries.sort(),['LICENSE','README.md','PROVENANCE.json','index.js','index.mjs','index.d.ts','index.d.mts','package.json','lib/decoder.js','lib/encoder.js','lib/options.js','lib/tables.js','lib/tables.mjs','lib/all-entities.mjs'].sort());
    }
    if (name === 'vpath-expression-matcher') {
      assert.equal(metadata.dependencies, undefined);
      const entries=run('tar',['-tzf',packed]).trim().split('\n').filter(f=>!f.endsWith('/')).map(f=>f.replace(/^package\//,''));
      assert.deepEqual(entries.sort(),['LICENSE','README.md','PROVENANCE.json','index.js','index.mjs','index.d.ts','index.d.mts','package.json','lib/expression.js','lib/matcher.js','lib/set.js'].sort());
    }
    if (name === 'vxml-naming' || name === 'vis-unsafe') {
      assert.equal(metadata.dependencies, undefined);
      const entries=run('tar',['-tzf',packed]).trim().split('\n').filter(f=>!f.endsWith('/')).map(f=>f.replace(/^package\//,''));
      assert.deepEqual(entries.sort(),['LICENSE','README.md','PROVENANCE.json','index.js','index.mjs','index.d.ts','package.json',...(name === 'vis-unsafe' ? ['index.d.mts',...fs.readdirSync(path.join(root,'packages/vis-unsafe/contexts')).map(f=>'contexts/'+f)] : [])].sort());
    }
    if (name === 'vanynum' || name === 'vstrnum') {
      assert.deepEqual(metadata.dependencies, name === 'vanynum' ? undefined : {vanynum:'0.1.0'});
      const entries=run('tar',['-tzf',packed]).trim().split('\n').filter(f=>!f.endsWith('/')).map(f=>f.replace(/^package\//,''));
      assert.deepEqual(entries.sort(),['LICENSE','README.md','PROVENANCE.json','index.js','index.d.ts','package.json',...(name === 'vanynum' ? ['lib/data.js'] : [])].sort());
    }
    if (name === 'vhtml-entities') {
      assert.equal(metadata.dependencies, undefined);
      const entries=run('tar',['-tzf',packed]).trim().split('\n').filter(f=>!f.endsWith('/')).map(f=>f.replace(/^package\//,''));
      assert.deepEqual(entries.sort(),['LICENSE','README.md','PROVENANCE.json','index.js','index.d.ts','package.json','lib/data.js'].sort());
    }
    if (name === 'vretry' || name === 'vasync-retry') {
      assert.deepEqual(metadata.dependencies, name === 'vretry' ? undefined : {vretry:'0.1.0'});
      const entries=run('tar',['-tzf',packed]).trim().split('\n').filter(f=>!f.endsWith('/')).map(f=>f.replace(/^package\//,''));
      assert.deepEqual(entries.sort(),['LICENSE','README.md','PROVENANCE.json','index.js','index.d.ts','package.json',...(name === 'vretry' ? ['retry-operation.js','retry-operation.d.ts'] : [])].sort());
    }
    if (name === 'vp-limit') {
      assert.deepEqual(metadata.dependencies, {'vyocto-queue':'0.1.0'});
      const entries=run('tar',['-tzf',packed]).trim().split('\n').filter(f=>!f.endsWith('/')).map(f=>f.replace(/^package\//,''));
      assert.deepEqual(entries.sort(),['LICENSE','README.md','PROVENANCE.json','index.js','index.d.ts','package.json'].sort());
    }
    if (name === 'vpaginator') {
      assert.deepEqual(metadata.dependencies,{vextend:'0.1.0'});
      const entries=run('tar',['-tzf',packed]).trim().split('\n').filter(f=>!f.endsWith('/')).map(f=>f.replace(/^package\//,''));
      assert.deepEqual(entries.sort(),['LICENSE','README.md','PROVENANCE.json','index.js','resource-stream.js','index.d.ts','package.json'].sort());
    }
    if (name === 'vfunctions-framework') {
      assert.deepEqual(Object.keys(metadata.dependencies).sort(), ['vbody-parser', 'vexpress', 'vminimist', 'von-finished', 'vread-package-up']);
      assert.equal(metadata.license, 'Apache-2.0');
      assert.deepEqual(metadata.bin, { 'vfunctions-framework': 'lib/main.js' });
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      const lib = fs.readdirSync(path.join(root, 'packages/vfunctions-framework/lib'), { recursive: true }).filter(file => file.endsWith('.js')).map(file => 'lib/' + file);
      assert.deepEqual(entries.sort(), ['LICENSE', 'README.md', 'PROVENANCE.json', 'index.d.ts', 'index.js', 'testing.js', 'testing.d.ts', 'package.json', ...lib].sort());
    }
    if (name === 'vexpress') {
      assert.deepEqual(Object.keys(metadata.dependencies).sort(), Object.values(require('../packages/vexpress/PROVENANCE.json').dependencies).sort());
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      assert.deepEqual(entries.sort(), ['LICENSE', 'README.md', 'PROVENANCE.json', 'index.d.ts', 'index.js', 'package.json',
        ...['application', 'express', 'request', 'response', 'utils', 'view', 'handlers'].map(file => 'lib/' + file + '.js')].sort());
    }
    if (['vjwa', 'vread-package-up', 'vminimist', 'vforwarded', 'vonce', 'vmerge-descriptors', 'vcontent-disposition', 'vcookie', 'vcookie-signature', 'vvary'].includes(name)) {
      assert.equal(metadata.dependencies, undefined);
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      assert.deepEqual(entries.sort(), ['LICENSE', 'README.md', 'PROVENANCE.json', 'index.d.ts', 'index.js', 'package.json'].sort());
    }
    if (name === 'vjws') {
      assert.deepEqual(metadata.dependencies, { vjwa: '0.1.0' });
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      assert.deepEqual(entries.sort(), ['LICENSE', 'README.md', 'PROVENANCE.json', 'index.d.ts', 'index.js', 'package.json', 'lib/core.js', 'lib/streams.js'].sort());
    }
    if (name === 'vjsonwebtoken') {
      assert.deepEqual(metadata.dependencies, { vjws: '0.1.0', vms: '0.1.0' });
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      const lib = fs.readdirSync(path.join(root, 'packages/vjsonwebtoken/lib')).map(file => 'lib/' + file);
      assert.deepEqual(entries.sort(), ['LICENSE', 'README.md', 'PROVENANCE.json', 'index.d.ts', 'index.js', 'package.json', ...lib].sort());
    }
    if (name === 'vhttps-proxy-agent' || name === 'vhttp-proxy-agent') {
      assert.deepEqual(metadata.dependencies, {'vagent-base':'0.1.0',vdebug:'0.1.0'});
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      assert.deepEqual(entries.sort(), ['LICENSE','README.md','PROVENANCE.json','index.d.ts','index.js','package.json','lib/options.js',name === 'vhttp-proxy-agent' ? 'lib/request.js' : 'lib/response.js'].sort());
    }
    if (name === 'vagent-base') {
      assert.equal(metadata.dependencies, undefined);
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      assert.deepEqual(entries.sort(), ['LICENSE','README.md','PROVENANCE.json','index.d.ts','index.js','helpers.js','package.json'].sort());
    }
    if (name === 'vteeny-request') {
      assert.deepEqual(Object.keys(metadata.dependencies).sort(), ['vhttp-proxy-agent','vhttps-proxy-agent','vnode-fetch','vstream-events']);
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      assert.deepEqual(entries.sort(), ['LICENSE','README.md','PROVENANCE.json','index.js','index.d.ts','package.json','lib/agents.js','lib/options.js','lib/multipart.js','lib/statistics.js','lib/read.js'].sort());
    }
    if (name === 'vjwks-rsa') {
      assert.deepEqual(metadata.dependencies, { vdebug:'0.1.0' });
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      const lib = fs.readdirSync(path.join(root,'packages/vjwks-rsa/lib')).map(file=>'lib/'+file);
      assert.deepEqual(entries.sort(), ['LICENSE','README.md','PROVENANCE.json','index.d.ts','index.js','package.json',...lib].sort());
    }
    if (name === 'vrouter') {
      assert.deepEqual(metadata.dependencies, { vdebug: '0.1.0', vdepd: '0.1.0', 'vpath-to-regexp': '0.1.0' });
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      assert.deepEqual(entries.sort(), ['LICENSE', 'README.md', 'PROVENANCE.json', 'index.d.ts', 'index.js', 'package.json', 'lib/layer.js', 'lib/route.js', 'lib/handlers.js', 'lib/regexp.js'].sort());
    }
    if (name === 'vcors') {
      assert.deepEqual(metadata.dependencies, { vvary: '0.1.0' });
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      assert.deepEqual(entries.sort(), ['LICENSE', 'README.md', 'PROVENANCE.json', 'index.d.ts', 'index.js', 'package.json'].sort());
    }
    if (name === 'vdepd') {
      assert.equal(metadata.dependencies, undefined);
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      assert.deepEqual(entries.sort(), ['LICENSE', 'README.md', 'PROVENANCE.json', 'index.d.ts', 'index.js', 'browser.js', 'validate.cjs', 'package.json'].sort());
    }
    if (name === 'vpath-to-regexp') {
      assert.equal(metadata.dependencies, undefined);
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      assert.deepEqual(entries.sort(), ['LICENSE', 'README.md', 'PROVENANCE.json', 'index.d.ts', 'index.js', 'regex.cjs', 'package.json'].sort());
    }
    if (name === 'vproxy-addr') {
      assert.deepEqual(metadata.dependencies, { vforwarded: '0.1.0', vipaddr: '0.1.0' });
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      assert.deepEqual(entries.sort(), ['LICENSE', 'README.md', 'PROVENANCE.json', 'index.d.ts', 'index.js', 'package.json'].sort());
    }
    if (name === 'vipaddr') {
      assert.equal(metadata.dependencies, undefined);
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      assert.deepEqual(entries.sort(), ['LICENSE', 'README.md', 'PROVENANCE.json', 'index.d.ts', 'index.js', 'package.json', 'lib/parse.js', 'lib/ranges.json'].sort());
    }
    if (name === 'vbody-parser') {
      assert.equal(Object.keys(metadata.dependencies).length, 9);
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      assert.deepEqual(entries.sort(), ['LICENSE', 'README.md', 'PROVENANCE.json', 'index.d.ts', 'index.js', 'package.json',
        'lib/read.js', 'lib/utils.js', ...['json', 'raw', 'text', 'urlencoded'].flatMap(type => ['lib/types/' + type + '.js', 'types/' + type + '.d.ts'])].sort());
    }
    if (name === 'vqs') {
      assert.equal(metadata.dependencies, undefined);
      assert.equal(metadata.license, 'BSD-3-Clause');
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      assert.deepEqual(entries.sort(), ['LICENSE', 'README.md', 'PROVENANCE.json', 'index.d.ts', 'index.js', 'package.json',
        'lib/parse.js', 'lib/stringify.js', 'lib/utils.js', 'lib/formats.js', 'lib/limit.js'].sort());
    }
    if (name === 'viconv-lite') {
      assert.equal(metadata.dependencies, undefined);
      const entries = run('tar', ['-tzf', packed]);
      assert.doesNotMatch(entries, /(?:\/test\/|safer-buffer|node_modules|\/bench\/)/);
      assert.match(entries, /package\/encodings\/tables\/gb18030-ranges.json/);
      assert.match(entries, /package\/types\/encodings.d.ts/);
      assert.match(entries, /package\/PROVENANCE.json/);
    }
    if (['vraw-body', 'vbytes', 'vmedia-typer', 'vtype-is', 'vnegotiator', 'vaccepts'].includes(name)) {
      const entries = run('tar', ['-tzf', packed]).trim().split('\n').filter(file => !file.endsWith('/')).map(file => file.replace(/^package\//, ''));
      assert.deepEqual(entries.sort(), ['LICENSE', 'README.md', 'index.d.ts', 'index.js', 'package.json'].sort());
    }
  }
  fs.writeFileSync(path.join(directory, 'consumer.cjs'), `
const archiveHash=require('vobject-hash');if(archiveHash('hello')!==require('node:crypto').createHash('sha1').update('string:5:hello').digest('hex'))throw new Error('Hash CJS archive');if(!Buffer.isBuffer(archiveHash(Buffer.from([255]),{algorithm:'passthrough',encoding:'buffer'})))throw new Error('Hash binary archive');
const archiveStorage=require('vgoogle-cloud-storage');const storageFile=new archiveStorage.Storage({projectId:'archive'}).bucket('fixture').file('a.pdf');if(storageFile.name!=='a.pdf'||archiveStorage.CRC32C.from(new Uint8Array([0,1,2,3,4,0]).subarray(1,5)).toString()!=='AQIDBA==')throw new Error('Storage CJS archive');
const archiveMime=require('vmime'),archiveLite=require('vmime/lite'),archiveTable=require('vmime/types/standard.js');if(archiveMime.getType('photo.JPG')!=='image/jpeg'||archiveLite.getType('a.docx')!==null||new archiveMime.Mime(archiveTable).getType('txt')!=='text/plain'||!Object.isFrozen(archiveTable['text/plain']))throw new Error('MIME CJS archive');
const ArchiveParser=require('vfast-xml-parser');if(new ArchiveParser.XMLParser().parse('<r>&amp;</r>',true).r!=='&'||ArchiveParser.XMLValidator.validate('<r/><s/>')===true||new ArchiveParser.XMLBuilder().build({r:'x'})!=='<r>x</r>')throw new Error('XML parser CJS archive');
const ArchiveBuilder=require('vfast-xml-builder');if(ArchiveBuilder({arrayNodeName:'x'}).build([1,2])!=='<x>1</x><x>2</x>')throw new Error('XML builder CJS archive');
const archiveNodable=require('vnodable-entities');if(new archiveNodable.EntityDecoder().decode('&lt;&#65junk;')!=='<&#65junk;'||new archiveNodable.EntityEncoder({encodeAllNamed:false}).encode('<')!=='&lt;')throw new Error('nodable CJS archive');
const archiveMatcher=require('vpath-expression-matcher');const archivePath=new archiveMatcher.Matcher();archivePath.push('item');
if(!archivePath.matches(new archiveMatcher.Expression('..item')))throw new Error('matcher CJS archive');
const archiveXMLNaming=require('vxml-naming'),archiveUnsafe=require('vis-unsafe');
if(!archiveXMLNaming.qName('𐀀:part')||!archiveUnsafe.isUnsafe('<script>',archiveUnsafe.HTML))throw new Error('XML helpers CJS archive');
const archiveAnyNumber=require('vanynum'),archiveStringNumber=require('vstrnum');
if(archiveAnyNumber('१२')!=='12'||archiveAnyNumber.anynum!==archiveAnyNumber||archiveStringNumber('−१२',{unicode:true})!==-12)throw new Error('numbers CJS archive');
const archiveEntities=require('vhtml-entities');if(archiveEntities.decode('&copy;')!=='©'||archiveEntities.encode('<')!=='&lt;'||archiveEntities.decodeEntity('&#65;')!=='A')throw new Error('entities CJS archive');
const archiveRetry=require('vretry');if(archiveRetry.timeouts({retries:1})[0]!==1000||require('vretry/lib/retry_operation')!==archiveRetry.RetryOperation)throw new Error('retry CJS archive');
require('vasync-retry')(()=>7,{retries:0}).then(x=>{if(x!==7)throw new Error('async retry CJS archive');});
const archiveQueue=new (require('vyocto-queue'))();archiveQueue.enqueue('ok');if(archiveQueue.dequeue()!=='ok')throw new Error('queue CJS archive');
const archiveLimit=require('vp-limit')(1);if(archiveLimit.concurrency!==1||typeof require('vp-limit').limitFunction!=='function')throw new Error('limit CJS archive');
archiveLimit(x=>x,42).then(x=>{if(x!==42)throw new Error('limit CJS task');});
const decoratedStream = require('vstream-events')({emit(){return true;},_read(){return 42;}});
const archivePromisify=require('vpromisify'),archiveProjectify=require('vprojectify');
if(!archivePromisify.promisify(cb=>cb(null,1)).promisified_)throw new Error('promisify CJS archive');
if(archiveProjectify.replaceProjectIdToken('{{projectId}}','p')!=='p')throw new Error('projectify CJS archive');
const {paginator:archivePaginator}=require('vpaginator');
if(archivePaginator.parseArguments_([{maxApiCalls:2}]).maxApiCalls!==2)throw new Error('paginator CJS archive');
const archiveDuplex=require('vduplexify')();
if(typeof archiveDuplex.setReadable!=='function'||archiveDuplex.readableHighWaterMark!==16384)throw new Error('duplexify CJS archive');archiveDuplex.destroy();
const {teenyRequest:archiveTeeny}=require('vteeny-request');
if(typeof archiveTeeny.defaults!=='function'||archiveTeeny.stats.counters.concurrentRequests!==0)throw new Error('teeny-request CJS archive');
if(decoratedStream._read()!==42)throw new Error('stream-events archive');
let retriedBody; require('vretry-request')(null, {request(o, cb) {cb(null, {statusCode:200}, 'ok');}}, (err, res, body) => {retriedBody=body;});
if(retriedBody!=='ok')throw new Error('retry archive');
if(new (require('vnode-fetch').Headers)({test:'ok'}).get('test')!=='ok')throw new Error('fetch archive');
if(typeof require('vgaxios').Gaxios.prototype.destroy!=='function')throw new Error('gaxios archive');
if(typeof require('vgoogle-auth-library').GoogleAuth !== 'function')throw new Error('auth archive');
if(require('vgcp-metadata').requestTimeout()!==3000)throw new Error('metadata archive');
if(require('vjson-bigint').parse('9007199254740993').valueOf()!=='9007199254740993')throw new Error('json archive');
if(!new (require('vgtoken').GoogleToken)().hasExpired())throw new Error('gtoken archive');
if(typeof require('vgoogle-logging-utils').getStructuredBackend().log!=='function')throw new Error('logging archive');
if(!require('vuuid').validate(require('vuuid').v4()))throw new Error('UUID archive');
if(require('vextend')(true,{}, {a:{b:1}}).a.b!==1)throw new Error('extend archive');
if(require('vis-stream').readable({pipe(){},_read(){},_readableState:null}))throw new Error('stream archive');
const {Agent:ArchiveAgent}=require('vagent-base');
const {HttpsProxyAgent:ArchiveProxy}=require('vhttps-proxy-agent');
const {HttpProxyAgent:ArchiveForward}=require('vhttp-proxy-agent');
if (!(new ArchiveForward('http://localhost:8080') instanceof ArchiveAgent)) throw new Error('forward proxy inheritance');
if (!(new ArchiveProxy('http://localhost:8080') instanceof ArchiveAgent)) throw new Error('proxy inheritance');
if (!(new ArchiveAgent() instanceof require('node:http').Agent)) throw new Error('agent inheritance');
const jwa = require('vjwa');
const jws = require('vjws');
const jwt = require('vjsonwebtoken');
const jwks = require('vjwks-rsa');
const jwksPair = require('node:crypto').generateKeyPairSync('rsa',{modulusLength:2048});
jwks({fetcher:()=>({keys:[{...jwksPair.publicKey.export({format:'jwk'}),kid:'archive'}]})}).getSigningKey('archive').then(key=>{
  if(key.getPublicKey()!==jwksPair.publicKey.export({format:'pem',type:'spki'}))throw new Error('installed vjwks-rsa failed');
}).catch(error=>{console.error(error);process.exitCode=1;});
if (jwt.verify(jwt.sign({iat:0}, 'key', {expiresIn:60}), 'key', {clockTimestamp:1}).iat !== 0) throw new Error('installed vjsonwebtoken failed');
if (!jws.verify(jws.sign({header:{alg:'HS256'},payload:'archive',secret:'key'}), 'HS256', 'key')) throw new Error('installed vjws failed');
if (!jwa('HS256').verify('archive', jwa('HS256').sign('archive', 'key'), 'key')) throw new Error('installed vjwa failed');
const vf = require('vfunctions-framework');
const vfTesting = require('vfunctions-framework/testing');
const vfHttp = require('node:http');
vf.http('archiveHandler', (req, res) => res.end('archive-ok'));
if (vfTesting.getFunction('archiveHandler') === undefined) throw new Error('registration missing');
const vfServer = vfTesting.getTestServer('archiveHandler');
vfServer.listen(0, '127.0.0.1', () => {
  vfHttp.get({host:'127.0.0.1',port:vfServer.address().port,agent:false}, response => {
    let text = ''; response.on('data', chunk => {text += chunk;});
    response.on('end', () => {
      vfServer.close();
      if (response.statusCode !== 200 || text !== 'archive-ok') throw new Error('installed framework failed');
    });
  }).on('error', error => {vfServer.close(); throw error;});
});

const manifestReader = require('vread-package-up');
const manifestResult = manifestReader.readPackageUpSync({cwd:__dirname,stopAt:__dirname,normalize:false});
require('node:assert/strict').equal(manifestResult.path, require('node:path').join(__dirname,'package.json'));
const parseArguments = require('vminimist');
require('node:assert/strict').deepEqual(parseArguments(['--v=false'], {alias:{verbose:'v'},boolean:'verbose'}), {_:[],verbose:false,v:false});
const cors = require('vcors');
const corsHeaders = {};
let corsEnds = 0;
cors({origin:/example/g})({method:'OPTIONS',headers:{origin:'https://example.test'}}, {
  statusCode:200, getHeader(name){return corsHeaders[name];}, setHeader(name,value){corsHeaders[name]=value;}, removeHeader(name){delete corsHeaders[name];}, end(){corsEnds++;}
}, error=>{throw error || new Error('unexpected preflight next');});
require('node:assert/strict').equal(corsHeaders['Access-Control-Allow-Origin'],'https://example.test');
require('node:assert/strict').equal(corsEnds,1);
const assert = require('node:assert/strict');
const express = require('vexpress');
const application = express();
application.get('/:id', (req, res) => res.end(req.params.id));
let applicationBody;
application({ url: '/42', method: 'GET', headers: {} }, { setHeader() {}, end(value) { applicationBody = value; } }, error => { throw error || new Error('missed app route'); });
assert.equal(applicationBody, '42');
assert.equal(express.json, require('vbody-parser').json);
const Router = require('vrouter');
const router = Router(); let routed;
router.get('/:id', (req, res) => { routed = req.params.id; res.end(); });
router({ url: '/42', method: 'GET' }, { end() {} }, error => { throw error || new Error('missed route'); });
assert.equal(routed, '42'); assert.equal(router.stack[0].route instanceof Router.Route, true);
const depd = require('vdepd');
process.env.NO_DEPRECATION = '*';
const warn = depd('archive');
class Base { constructor(value) { this.value = value; } }
assert.equal(new (warn.function(Base))(3).value, 3);
const owner = { value: 1 }; warn.property(owner, 'value');
const child = Object.create(owner); child.value = 2; assert.equal(owner.value, 1); assert.equal(child.value, 2);
assert.ok(Object.isFrozen(warn));
const route = require('vpath-to-regexp');
assert.equal(route.match('/users/:id')('/users/a%2Fb').params.id, 'a/b');
assert.equal(route.compile('/files/*path')({path:['a','b']}), '/files/a/b');
const routeData = route.parse('/:id'); const routeMatcher = route.match(routeData);
routeData.tokens[1].name = 'changed'; assert.equal(routeMatcher('/x').params.id, 'x');
const proxyaddr = require('vproxy-addr');
assert.equal(proxyaddr({ headers: { 'x-forwarded-for': '198.51.100.1,\\t10.0.0.1' }, socket: { remoteAddress: '127.0.0.1' } }, ['loopback', '10.0.0.0/8']), '198.51.100.1');
assert.equal(proxyaddr.compile('::/0')('::ffff:192.0.2.1'), false);
assert.equal(proxyaddr.compile('0.0.0.0/0')('192.0.2.1'), true);
const ipaddr = require('vipaddr');
assert.equal(ipaddr.process('::ffff:192.0.2.1').toString(), '192.0.2.1');
assert.equal(ipaddr.process('::192.0.2.1').kind(), 'ipv6');
assert.throws(() => ipaddr.parse('1.2.3.4').match(ipaddr.parse('1.2.3.4'), NaN), RangeError);
const forwarded = require('vforwarded');
assert.deepEqual(forwarded({ headers: { 'x-forwarded-for': '198.51.100.7,\\t10.0.0.1' }, socket: { remoteAddress: '::1' } }), ['::1', '10.0.0.1', '198.51.100.7']);
const once = require('vonce');
const merge = require('vmerge-descriptors');
const wrapped = once(Object.assign(n => n + 1, { called: true, value: 99 }));
Object.freeze(wrapped);
assert.equal(wrapped(2), 3); assert.equal(wrapped(8), 3); assert.equal(wrapped.called, true);
const symbol = Symbol();
let reads = 0;
const merged = merge({}, Object.defineProperty({}, symbol, { get() { reads++; return 4; } }));
assert.equal(reads, 0); assert.equal(merged[symbol], 4); assert.equal(reads, 1);
assert.equal(merge({ value: 1 }, { value: 2 }, false).value, 1);
const signature = require('vcookie-signature');
assert.equal(signature.unsign(signature.sign('雪', 'key'), 'key'), '雪');
assert.equal(signature.unsign(signature.sign('雪', 'key'), 'wrong'), false);
const vary = require('vvary');
assert.equal(vary.append('Accept,\\tOrigin', 'origin'), 'Accept,\\tOrigin');
assert.equal(vary.append('Bad Header', 'Origin'), 'Bad Header, Origin');
assert.throws(() => vary.append('Accept', 'Bad Header'), TypeError);
const cookie = require('vcookie');
assert.equal(cookie.parse(cookie.serialize('sid', '雪')).sid, '雪');
assert.equal(cookie.parseCookie('__proto__=x').__proto__, 'x');
assert.equal(Object.getPrototypeOf(cookie.parseCookie('')), null);
assert.equal(cookie.parseSetCookie(cookie.stringifySetCookie({ name: 'x', value: 'y', secure: true })).secure, true);
assert.equal(cookie.serialize('x', 'y', { secure: 'false', path: null }), 'x=y; Secure');
assert.throws(() => cookie.stringifySetCookie({ name: 'x', value: 'y', secure: 'false' }), TypeError);
const disposition = require('vcontent-disposition');
assert.equal(disposition.parse(disposition.create('雪.txt')).parameters.filename, '雪.txt');
assert.equal(Object.getPrototypeOf(disposition.parse('attachment').parameters), null);
assert.throws(() => disposition.create(1), TypeError);
const qs = require('vqs');
assert.deepEqual(qs.parse('a[b]=x&a[c][]=y'), { a: { b: 'x', c: ['y'] } });
assert.equal(qs.stringify({ a: '~* ' }, { format: qs.formats.WHATWG }), 'a=%7E*+');
assert.throws(() => qs.parse('a=1', { parameterLimit: NaN }), TypeError);
const getRawBody = require('vraw-body');
const { Readable } = require('node:stream');
const bodyParser = require('vbody-parser');
for (const type of ['json', 'raw', 'text', 'urlencoded']) assert.equal(bodyParser[type], require('vbody-parser/' + type));
(async () => {
  const request = Readable.from([Buffer.from('{"a":1}')]);
  Object.assign(request, { headers: { 'content-type': 'application/json', 'content-length': '7' }, complete: false, socket: { readable: true } });
  await new Promise((resolve, reject) => bodyParser.json()(request, {}, error => error ? reject(error) : resolve()));
  assert.deepEqual(request.body, { a: 1 });
  assert.deepEqual(await getRawBody(Readable.from([Buffer.from('abc')]), { limit: '3b' }), Buffer.from('abc'));
  assert.equal(await getRawBody(Readable.from([Buffer.from('9439da', 'hex'), Buffer.from('33', 'hex')]), 'gb18030'), '💩');
})().catch(error => { console.error(error); process.exitCode = 1; });
const iconv = require('viconv-lite');
assert.equal(iconv.decode(Buffer.from('9439da33', 'hex'), 'gb18030'), '💩');
assert.equal(iconv.decode(iconv.encode('abc', 'utf32', Object.freeze({})), 'utf32'), 'abc');
const bytes = require('vbytes');
assert.equal(bytes.parse('100kb'), 102400);
assert.throws(() => bytes.parse('100kbjunk'), TypeError);
assert.equal(bytes.format(1.01, { decimalPlaces: 4 }), '1.01B');
const media = require('vmedia-typer');
const typeis = require('vtype-is');
assert.equal(media.format(media.parse('application/foo+bar+json')), 'application/foo+bar+json');
assert.equal(media.test('text/K'), false);
assert.equal(typeis({ headers: { 'content-length': '0', 'content-type': 'TEXT/HTML' } }, ['HTML']), 'HTML');
assert.equal(typeis.is('application/problem+json', ['+JSON']), 'application/problem+json');
assert.equal(typeis.hasBody({ headers: { 'content-length': '-1' } }), false);
const Negotiator = require('vnegotiator');
const Accepts = require('vaccepts');
const request = { headers: { accept: 'text/html;q=2, application/json;q=0.5' } };
assert.equal(new Negotiator(request).mediaType(['text/html', 'application/json']), 'text/html');
assert.equal(Accepts(request).types('html', 'json'), 'html');
assert.equal(Accepts({ headers: { accept: '' } }).types('json', 'html'), 'json');
`);
  fs.writeFileSync(path.join(directory, 'consumer.mjs'), `
import archiveHashESM,{sha1 as archiveSHA1} from 'vobject-hash';if(archiveHashESM('a')!==archiveSHA1('a'))throw new Error('Hash ESM archive');
import {Storage as ArchiveStorage,CRC32C as ArchiveCRC} from 'vgoogle-cloud-storage';if(new ArchiveStorage({projectId:'archive'}).bucket('fixture').file('a.pdf').name!=='a.pdf'||ArchiveCRC.from(0).toString()!=='AAAAAA==')throw new Error('Storage ESM archive');
import archiveMimeESM,{Mime as ArchiveMimeClass} from 'vmime';import archiveLiteESM from 'vmime/lite';import archiveOther from 'vmime/types/other.js';if(archiveMimeESM.getType('a.js')!=='text/javascript'||archiveLiteESM.getType('txt')!=='text/plain'||new ArchiveMimeClass(archiveOther).getType('docx')!=='application/vnd.openxmlformats-officedocument.wordprocessingml.document')throw new Error('MIME ESM archive');
import {XMLParser as ArchiveParserESM,XMLValidator as ArchiveValidatorESM} from 'vfast-xml-parser';if(new ArchiveParserESM().parse('<r><a/></r>').r.a!==''||ArchiveValidatorESM.validate('<r a="&bad"/>')===true)throw new Error('XML parser ESM archive');
import ArchiveBuilderESM,{Builder as ArchiveNamedBuilder} from 'vfast-xml-builder';if(ArchiveBuilderESM!==ArchiveNamedBuilder||new ArchiveBuilderESM().build({r:'<'})!=='<r>&lt;</r>')throw new Error('XML builder ESM archive');
import {EntityDecoder as ArchiveDecoder,EntityEncoder as ArchiveEncoder,ALL_ENTITIES as ArchiveEntityTable} from 'vnodable-entities';
if(new ArchiveDecoder({namedEntities:ArchiveEntityTable}).decode('&ocirc;')!=='ô'||new ArchiveEncoder({encodeAllNamed:false}).encode('<')!=='&lt;')throw new Error('nodable ESM archive');
import archiveMatcher,{Matcher as ArchiveMatcher,Expression as ArchiveExpression} from 'vpath-expression-matcher';
const archivePath=new ArchiveMatcher();archivePath.push('item');if(archiveMatcher.Matcher!==ArchiveMatcher||!archivePath.matches(new ArchiveExpression('..item')))throw new Error('matcher ESM archive');
import {qName as archiveQName} from 'vxml-naming';
import archiveUnsafe,{HTML as archiveHTML} from 'vis-unsafe';
if(!archiveQName('𐀀:part')||!archiveUnsafe('<script>',archiveHTML))throw new Error('XML helpers ESM archive');
import archiveAnyNumber,{anynum as archiveNamedNumber} from 'vanynum';
import archiveStringNumber from 'vstrnum';
if(archiveAnyNumber!==archiveNamedNumber||archiveAnyNumber('१२')!=='12'||archiveStringNumber('−१२',{unicode:true})!==-12)throw new Error('numbers ESM archive');
import {encode as archiveEncodeEntities,decode as archiveDecodeEntities,decodeEntity as archiveDecodeEntity} from 'vhtml-entities';
if(archiveEncodeEntities('<')!=='&lt;'||archiveDecodeEntities('&copy;')!=='©'||archiveDecodeEntity('&#65;')!=='A')throw new Error('entities ESM archive');
import archiveRetry,{operation as archiveOperation} from 'vretry';
import ArchiveRetryOperation from 'vretry/lib/retry_operation.js';
import archiveAsyncRetry from 'vasync-retry';
if(archiveRetry.operation!==archiveOperation||!(archiveOperation() instanceof ArchiveRetryOperation)||await archiveAsyncRetry(()=>7,{retries:0})!==7)throw new Error('retry ESM archive');
import ArchiveQueue from 'vyocto-queue';
import archiveLimit,{limitFunction as archiveLimitFunction} from 'vp-limit';
const archiveQueue=new ArchiveQueue();archiveQueue.enqueue(1);if([...archiveQueue.drain()][0]!==1)throw new Error('queue ESM archive');
if(await archiveLimit(1)(x=>x,42)!==42||await archiveLimitFunction(x=>x,{concurrency:1})(7)!==7)throw new Error('limit ESM archive');
import streamEventsArchive from 'vstream-events';
import {promisify as archivePromisify} from 'vpromisify';
import {replaceProjectIdToken as archiveProjectify} from 'vprojectify';
if(!archivePromisify(cb=>cb(null,1)).promisified_||archiveProjectify('{{projectId}}','p')!=='p')throw new Error('cloud helpers ESM archive');
import {paginator as archivePaginator} from 'vpaginator';
if(archivePaginator.parseArguments_([{maxResults:3}]).maxResults!==3)throw new Error('paginator ESM archive');
import archiveDuplexify from 'vduplexify';
const archiveDuplex=archiveDuplexify.obj();if(!archiveDuplex.readableObjectMode)throw new Error('duplexify ESM archive');archiveDuplex.destroy();
import {teenyRequest as archiveTeeny} from 'vteeny-request';
if(typeof archiveTeeny.close!=='function')throw new Error('teeny-request ESM archive');
if(typeof streamEventsArchive!=='function')throw new Error('stream-events ESM archive');
import retryArchive, {defaults as retryDefaults, getNextRetryDelay as retryDelay} from 'vretry-request';
if(typeof retryArchive!=='function'||retryDefaults.retries!==2||typeof retryDelay!=='function')throw new Error('retry ESM archive');
import fetchArchive, {Response as ArchiveResponse} from 'vnode-fetch';
import {GoogleAuth as ArchiveAuth, OAuth2Client as ArchiveOAuth, JWTAccess as ArchiveJWTAccess} from 'vgoogle-auth-library';
if(await new ArchiveAuth({projectId:'project'}).getProjectId()!=='project'||typeof ArchiveJWTAccess!=='function')throw new Error('auth ESM archive');
const archiveOAuth=new ArchiveOAuth();archiveOAuth.setCredentials({access_token:'token'});
if((await archiveOAuth.getRequestHeaders()).get('authorization')!=='Bearer token')throw new Error('auth headers archive');
import {requestTimeout as metadataTimeout} from 'vgcp-metadata';
if(metadataTimeout()!==3000)throw new Error('metadata ESM archive');
import jsonBig from 'vjson-bigint';
if(jsonBig.stringify(jsonBig.parse('9007199254740993'))!=='9007199254740993')throw new Error('json ESM archive');
import {placeholder as loggingPlaceholder} from 'vgoogle-logging-utils';
if (loggingPlaceholder.on('log', () => {}) !== loggingPlaceholder) throw new Error('logging ESM archive');
import {GoogleToken as ArchiveToken} from 'vgtoken';
if (!new ArchiveToken().hasExpired()) throw new Error('gtoken ESM archive');
import {Gaxios as ArchiveGaxios} from 'vgaxios';
if (typeof fetchArchive !== 'function' || await new ArchiveResponse('ok').text() !== 'ok') throw new Error('fetch ESM archive');
const archiveClient = new ArchiveGaxios();
const archiveResult = await archiveClient.request({url:'http://example.test', noProxy:['*'], adapter:async config=>({config, data:'ok', status:200, statusText:'OK', headers:{}, request:{responseURL:config.url}})});
if (archiveResult.data !== 'ok') throw new Error('gaxios ESM archive');
archiveClient.destroy();
import {Agent as ArchiveAgent} from 'vagent-base';
import {HttpsProxyAgent as ArchiveProxy} from 'vhttps-proxy-agent';
import {HttpProxyAgent as ArchiveForward} from 'vhttp-proxy-agent';
if (!(new ArchiveForward('http://localhost:8080') instanceof ArchiveAgent)) throw new Error('forward proxy ESM inheritance');
if (!(new ArchiveProxy('http://localhost:8080') instanceof ArchiveAgent)) throw new Error('proxy ESM inheritance');
if (typeof ArchiveAgent !== 'function') throw new Error('agent ESM export');
import jwa from 'vjwa';
import jws, { sign as signJws } from 'vjws';
import jwt, { sign as signJwt, verify as verifyJwt } from 'vjsonwebtoken';
if (verifyJwt(signJwt({iat:0}, 'key', {expiresIn:60}), 'key', {clockTimestamp:1}).iat !== 0 || typeof jwt.decode !== 'function') throw new Error('installed ESM vjsonwebtoken failed');
if (!jws.verify(signJws({header:{alg:'HS256'},payload:'archive',secret:'key'}), 'HS256', 'key')) throw new Error('installed ESM vjws failed');
if (!jwa('HS256').verify('archive', jwa('HS256').sign('archive', 'key'), 'key')) throw new Error('installed ESM vjwa failed');
import * as vf from 'vfunctions-framework';
import jwks, { JwksClient } from 'vjwks-rsa';
if (!(jwks({fetcher:()=>({keys:[]})}) instanceof JwksClient)) throw new Error('installed ESM vjwks-rsa failed');
import * as vfTesting from 'vfunctions-framework/testing';
import vfHttp from 'node:http';
vf.http('archiveHandler', (req, res) => res.end('archive-ok'));
if (vfTesting.getFunction('archiveHandler') === undefined) throw new Error('registration missing');
const vfServer = vfTesting.getTestServer('archiveHandler');
vfServer.listen(0, '127.0.0.1', () => {
  vfHttp.get({host:'127.0.0.1',port:vfServer.address().port,agent:false}, response => {
    let text = ''; response.on('data', chunk => {text += chunk;});
    response.on('end', () => {
      vfServer.close();
      if (response.statusCode !== 200 || text !== 'archive-ok') throw new Error('installed framework failed');
    });
  }).on('error', error => {vfServer.close(); throw error;});
});

import { readPackageUp } from 'vread-package-up';
const manifestResult = await readPackageUp({cwd:new URL('.',import.meta.url),stopAt:new URL('.',import.meta.url),normalize:false});
if (!manifestResult || typeof manifestResult.packageJson !== 'object') throw new Error('manifest ESM consumer failed');
import parseArguments from 'vminimist';
if (parseArguments(['--port=08080'], {string:'port'}).port !== '08080') throw new Error('argument parser ESM import failed');
import cors from 'vcors';
let corsNext = 0;
cors({origin:false})({method:'GET',headers:{}},{},error=>{if(error)throw error;corsNext++;});
if(corsNext!==1)throw new Error('CORS did not continue');
import assert from 'node:assert/strict';
import express, { json as expressJson, Router as ExpressRouter } from 'vexpress';
assert.equal(express.json, expressJson); assert.equal(express.Router, ExpressRouter);
const application = express();
application.get('/:id', (req, res) => res.end(req.params.id));
let applicationBody;
application({ url: '/42', method: 'GET', headers: {} }, { setHeader() {}, end(value) { applicationBody = value; } }, error => { throw error || new Error('missed app route'); });
assert.equal(applicationBody, '42');
import Router, { Route } from 'vrouter';
assert.equal(Router.Route, Route);
const router = new Router(); let routed;
router.get('/:id', (req, res) => { routed = req.params.id; res.end(); });
router({ url: '/42', method: 'GET' }, { end() {} }, error => { throw error || new Error('missed route'); });
assert.equal(routed, '42');
import depd from 'vdepd';
process.env.NO_DEPRECATION = '*';
const warn = depd('archive');
assert.equal(warn.function(x => x + 1)(2), 3);
import route, { parse as parseRoute, match as matchRoute, compile as compileRoute, pathToRegexp, stringify as stringifyRoute, TokenData, PathError } from 'vpath-to-regexp';
assert.equal(route.parse, parseRoute); assert.equal(route.match, matchRoute); assert.equal(route.compile, compileRoute);
assert.equal(pathToRegexp('/x').regexp.test('/x'), true);
assert.equal(stringifyRoute(new TokenData([{type:'param',name:'name with space'}])), ':"name with space"');
assert.ok(new PathError('bad route', '/x') instanceof TypeError);
import proxyaddr, { all as allProxyAddresses, compile as compileTrust } from 'vproxy-addr';
assert.equal(proxyaddr.all, allProxyAddresses); assert.equal(proxyaddr.compile, compileTrust);
assert.equal(compileTrust('::ffff:10.0.0.0/104')('10.0.0.1'), true);
assert.deepEqual(allProxyAddresses({ headers: {}, socket: {} }), [undefined]);
import ipaddr, { IPv4, IPv6, parse as parseIP, fromByteArray } from 'vipaddr';
assert.equal(ipaddr.IPv4, IPv4); assert.equal(ipaddr.IPv6, IPv6); assert.equal(ipaddr.parse, parseIP);
assert.equal(fromByteArray(new Uint8Array([127, 0, 0, 1])).toString(), '127.0.0.1');
assert.equal(IPv6.parse('::1').match(IPv6.parseCIDR('::/0')), true);
import forwarded from 'vforwarded';
assert.deepEqual(forwarded({ headers: {}, connection: {} }), [undefined]);
import once, { strict, proto } from 'vonce';
import merge from 'vmerge-descriptors';
assert.equal(once.strict, strict); assert.equal(once.proto, proto);
const wrapped = strict(n => n + 1);
assert.equal(wrapped(1), 2); assert.throws(() => wrapped(1));
const symbol = Symbol();
assert.equal(merge({}, { [symbol]: 3 })[symbol], 3);
import signature, { sign, unsign } from 'vcookie-signature';
assert.equal(signature.sign, sign); assert.equal(signature.unsign, unsign);
assert.equal(unsign(sign('', new Uint8Array([1, 2, 3])), new Uint8Array([1, 2, 3])), '');
import vary, { append } from 'vvary';
assert.equal(vary.append, append); assert.equal(append('Accept', 'Origin'), 'Accept, Origin');
import cookie, { parse as parseCookieLegacy, serialize, parseCookie, stringifyCookie, parseSetCookie, stringifySetCookie } from 'vcookie';
assert.deepEqual([cookie.parse, cookie.serialize, cookie.parseCookie, cookie.stringifyCookie, cookie.parseSetCookie, cookie.stringifySetCookie], [parseCookieLegacy, serialize, parseCookie, stringifyCookie, parseSetCookie, stringifySetCookie]);
assert.equal(parseCookie(stringifyCookie({ x: '雪' })).x, '雪');
import disposition, { create as createDisposition, parse as parseDisposition, format as formatDisposition, encodeExtended, decodeExtended } from 'vcontent-disposition';
assert.equal(disposition.create, createDisposition); assert.equal(disposition.parse, parseDisposition);
assert.equal(disposition.format, formatDisposition); assert.equal(disposition.encodeExtended, encodeExtended); assert.equal(disposition.decodeExtended, decodeExtended);
assert.equal(decodeExtended(encodeExtended('雪.txt')), '雪.txt');
assert.equal(parseDisposition(createDisposition('雪.txt')).parameters.filename, '雪.txt');
import qs, { parse as parseQuery, stringify, formats } from 'vqs';
assert.equal(qs.parse, parseQuery); assert.equal(qs.stringify, stringify); assert.equal(qs.formats, formats);
assert.deepEqual(parseQuery('__proto__[polluted]=yes&a[]=x'), { a: ['x'] });
assert.equal(Object.prototype.polluted, undefined);
import getRawBody from 'vraw-body';
import { Readable } from 'node:stream';
import bodyParser, { json, raw, text, urlencoded } from 'vbody-parser';
import jsonParser from 'vbody-parser/json';
import rawParser from 'vbody-parser/raw';
import textParser from 'vbody-parser/text';
import formParser from 'vbody-parser/urlencoded';
assert.deepEqual([json, raw, text, urlencoded], [jsonParser, rawParser, textParser, formParser]);
assert.equal(bodyParser.json, json);
const formRequest = Readable.from([Buffer.from('a=1&b=2')]);
Object.assign(formRequest, { headers: { 'content-type': 'application/x-www-form-urlencoded', 'content-length': '7' }, complete: false, socket: { readable: true } });
await new Promise((resolve, reject) => formParser({ parameterLimit: 2 ** 32 })(formRequest, {}, error => error ? reject(error) : resolve()));
assert.deepEqual(formRequest.body, { a: '1', b: '2' });
assert.equal(await getRawBody(Readable.from([Buffer.from('abc')]), true), 'abc');
await assert.rejects(getRawBody(Readable.from([Buffer.from('abc')]), { limit: 2 }), { status: 413 });
import iconv, { encode, decode, getDecoder } from 'viconv-lite';
assert.equal(iconv.encode, encode); assert.equal(iconv.decode, decode);
const decoder = getDecoder('gb18030');
assert.equal(decoder.write(Buffer.from('9439da', 'hex')), '');
assert.equal(decoder.write(Buffer.from('33', 'hex')), '💩');
import bytes, { parse as parseBytes, format as formatBytes } from 'vbytes';
assert.equal(bytes.parse, parseBytes); assert.equal(bytes.format, formatBytes);
assert.equal(parseBytes('-1.00000000000000000001kb'), -1025);
import media, { parse, format, test } from 'vmedia-typer';
import typeis, { is, match, hasBody, normalize } from 'vtype-is';
assert.equal(media.parse, parse); assert.equal(typeis.is, is);
assert.equal(format(parse('text/x+')), 'text/x+'); assert.equal(test('text/html'), true);
assert.equal(match('TEXT/*', 'text/html'), true); assert.equal(normalize('json'), 'application/json');
assert.equal(hasBody({ headers: { 'content-length': '0' } }), true);
import Negotiator, { Negotiator as NamedNegotiator } from 'vnegotiator';
import Accepts from 'vaccepts';
assert.equal(Negotiator, NamedNegotiator);
assert.equal(Negotiator({ headers: {} }).mediaType(['text/html']), 'text/html');
assert.equal(new Accepts({ headers: {} }).types('html'), 'html');
`);
  const source = `
import typedHash,{writeToStream as typedWriteHash} from 'vobject-hash';const typedDigest:string=typedHash({x:1});const typedDigestBytes:Uint8Array=typedHash('a',{encoding:'buffer'});typedWriteHash('a',{write(data:string|Uint8Array){void data;}});void typedDigest;void typedDigestBytes;
import {Storage as TypedStorage,type File as TypedStorageFile} from 'vgoogle-cloud-storage';const typedStorageFile:TypedStorageFile=new TypedStorage({projectId:'archive'}).bucket('fixture').file('a.pdf');const typedStorageURL:Promise<[string]>=typedStorageFile.getSignedUrl({action:'read',version:'v4',expires:Date.now()+60000});void typedStorageURL;
import typedMime,{Mime as TypedMime} from 'vmime';import typedLite from 'vmime/lite';import typedStandard from 'vmime/types/standard.js';import typedOther from 'vmime/types/other.js';const typedMimeInstance:TypedMime=new TypedMime(typedStandard,typedOther);const typedMimeResult:string|null=typedMime.getType('a.txt');const typedMimeSet:Set<string>|null=typedLite.getAllExtensions('text/plain');void typedMimeInstance;void typedMimeResult;void typedMimeSet;
// @ts-expect-error exported extension arrays are readonly
typedStandard['text/plain'].push('bad');

import {XMLParser as TypedParser,XMLBuilder as TypedParserBuilder,XMLValidator as TypedValidator,type X2jOptions} from 'vfast-xml-parser';const parserOpts:X2jOptions={processEntities:{maxEntityCount:2},htmlEntities:{copy:'©'}};new TypedParser(parserOpts).parse(new Uint8Array(),false);const parserBuilt:string=new TypedParserBuilder().build({r:'x'});TypedValidator.validate(parserBuilt);
import TypedBuilder from 'vfast-xml-builder';const builtXML:string=TypedBuilder({arrayNodeName:'x'}).build([1]);void builtXML;
import {EntityDecoder as TypedDecoder,EntityEncoder as TypedEncoder,ALL_ENTITIES as TypedEntityTable} from 'vnodable-entities';
const typedNodableResult:string=new TypedDecoder({namedEntities:TypedEntityTable,onInputEntity:()=> 'allow'}).decode('&lt;');
const typedNodableEncoded:string=new TypedEncoder({encodeAllNamed:false}).encode('<');void typedNodableResult;void typedNodableEncoded;
import typedMatcher,{Matcher as TypedMatcher,Expression as TypedExpression,ExpressionSet as TypedSet} from 'vpath-expression-matcher';
const typedPath=new TypedMatcher();typedPath.push('item');const typedSnapshot=typedPath.readOnly().snapshot();typedPath.restore(typedSnapshot);
const typedHit:TypedExpression<number>|null=new TypedSet<number>().add(new TypedExpression('..item',{},42)).findMatch(typedPath);
void typedHit;void new typedMatcher.Matcher();
import {qName as typedQName} from 'vxml-naming';
import typedUnsafe,{HTML as typedHTML} from 'vis-unsafe';
const typedXMLName:boolean=typedQName('𐀀:part');const typedUnsafeResult:boolean=typedUnsafe('<script>',typedHTML);
void typedXMLName;void typedUnsafeResult;
import typedAnyNumber,{anynum as typedNamedNumber} from 'vanynum';
import typedStringNumber from 'vstrnum';
const typedNormalized:string=typedNamedNumber('१२');
const typedParsed:string|number|null=typedStringNumber('12',{unicode:true});
const typedUnchanged:{id:number}=typedAnyNumber({id:1});
void [typedNormalized,typedParsed,typedUnchanged];
import {encode as typedEncodeEntities,decode as typedDecodeEntities,type EncodeOptions as TypedEntityOptions} from 'vhtml-entities';
const typedEntityOptions:TypedEntityOptions={mode:'nonAscii',level:'html5'};
const typedEntityResult:string=typedDecodeEntities(typedEncodeEntities('雪',typedEntityOptions));
void typedEntityResult;
import {operation as typedRetryOperation, type Options as TypedRetryOptions} from 'vretry';
import TypedRetryOperation from 'vretry/lib/retry_operation';
import typedAsyncRetry from 'vasync-retry';
const typedRetryOpts:TypedRetryOptions={retries:2};
const typedRetryOp:TypedRetryOperation=typedRetryOperation(typedRetryOpts);
const typedRetryResult:Promise<number>=typedAsyncRetry((bail,n)=>n,typedRetryOpts);
void [typedRetryOp,typedRetryResult];
import TypedQueue from 'vyocto-queue';
import typedLimit,{limitFunction as typedLimitFunction,type LimitFunction as TypedLimit} from 'vp-limit';
const typedQueue=new TypedQueue<string>();typedQueue.enqueue('ok');const typedDequeued:string|undefined=typedQueue.dequeue();
const typedLimiter:TypedLimit=typedLimit({concurrency:2,rejectOnClear:true});
const typedLimited:Promise<number>=typedLimiter((x:number)=>x,1);
const typedLimitedFn:Promise<string>=typedLimitFunction((s:string)=>s,{concurrency:1})('ok');
import typedStreamEvents = require('vstream-events');
import {promisify as typedCloudPromisify, callbackify as typedCloudCallbackify} from 'vpromisify';
import {replaceProjectIdToken as typedProjectify} from 'vprojectify';
const typedCloudResult:Promise<[number]>=typedCloudPromisify((cb:(e:Error|null,n:number)=>void)=>cb(null,1))();
typedCloudCallbackify(async()=>[1,'x'] as [number,string])((e,n,s)=>{const count:number=n;const text:string=s;void e;void count;void text;});
const typedProjectResult:{id:string}=typedProjectify({id:'{{projectId}}'},'p');
import {ResourceStream as TypedPaginatorStream, paginator as typedPaginator} from 'vpaginator';
const typedPages=new TypedPaginatorStream<{id:number}>({maxApiCalls:1},(q,cb)=>cb(null,[{id:1}],null));
typedPages.on('data',item=>{const id:number=item.id;void id;});
typedPaginator.streamify('list');
import typedDuplexify = require('vduplexify');
class TypedDuplexProxy extends typedDuplexify {}
new TypedDuplexProxy(null,null,{objectMode:true}).write(false);
import {teenyRequest as typedTeeny} from 'vteeny-request';
typedTeeny({uri:'http://example.test',proxy:false,timeout:100},(error,response,body)=>{if(response){const status:number=response.statusCode;void status;}void error;void body;});
const typedDecoratedStream = typedStreamEvents({emit(){return false;},_read(){return 42;},custom:'value'});
const streamEventCustom: string = typedDecoratedStream.custom;
import typedRetry = require('vretry-request');
const retryHandle: typedRetry.Abortable = typedRetry(null, {request(o, cb) {cb(null, {statusCode:200}, 'ok');}}, () => {});
retryHandle.abort();
const retryStream: typedRetry.RetryStream = typedRetry(null, {request() {throw new Error('fixture');}});
retryStream.on('error', () => {});retryStream.abort();
import typedFetch, {Request as TypedFetchRequest} from 'vnode-fetch';
import {GoogleAuth as TypedAuth, JWT as TypedJWT} from 'vgoogle-auth-library';
const typedAuth = new TypedAuth({authClient:new TypedJWT({email:'test',key:'test'}),projectId:'project'});
const typedProject:Promise<string> = typedAuth.getProjectId();
import {instance as typedMetadata, type Options as MetadataOptions} from 'vgcp-metadata';
const metadataOptions: MetadataOptions = {property:'id',timeout:100};
const metadataContract: (options?: string | MetadataOptions) => Promise<string> = typedMetadata<string>;
import typedJSON = require('vjson-bigint');
const exactJSONNumber: typedJSON.ExactNumber = new typedJSON.ExactNumber('9007199254740993');
const jsonString: string | undefined = typedJSON.stringify({exactJSONNumber});
import {log as typedLog} from 'vgoogle-logging-utils';
const typedLogging = typedLog('types'); typedLogging.on('log', (fields, args) => { void [fields,args]; }).info('ok');
import {GoogleToken as TypedToken, type TokenData as GTokenData} from 'vgtoken';
const typedToken = new TypedToken({email:'service@example.test', scope:['scope']});
const getTypedToken: () => Promise<GTokenData> = () => typedToken.getToken();
void getTypedToken;
import {Gaxios as TypedGaxios} from 'vgaxios';
const fetchPromise = typedFetch(new TypedFetchRequest('http://example.test'));
const typedClient = new TypedGaxios({maxContentLength:1024});
const gaxiosPromise = typedClient.request<{ok:boolean}>({url:'http://example.test', responseType:'json'});
typedClient.destroy();
void fetchPromise; void gaxiosPromise;
import {Agent as TypedAgent, type AgentConnectOpts, type ClientRequest as AgentRequest, type Duplex as AgentDuplex} from 'vagent-base';
import {HttpsProxyAgent as TypedProxy} from 'vhttps-proxy-agent';
import {HttpProxyAgent as TypedForward} from 'vhttp-proxy-agent';
const forwardProxy: TypedAgent = new TypedForward('http://proxy.test', {headers:()=>({'X-Test':'value'}),connectTimeout:1000});
void forwardProxy;
const configuredProxy: TypedAgent = new TypedProxy('https://proxy.test', {headers:()=>({'X-Test':'value'}),maxProxyHeaderSize:16384,connectTimeout:1000});
void configuredProxy;
declare const agentSocket: AgentDuplex;
class DirectAgent extends TypedAgent { connect(_request: AgentRequest, _options: AgentConnectOpts) { return agentSocket; } }
class StructuralAgent extends TypedAgent { connect() { return {addRequest(request: AgentRequest, options: AgentConnectOpts) { void [request, options]; }}; } }
const structuralAgent: TypedAgent = new StructuralAgent();
void structuralAgent;
const configuredAgent = new DirectAgent({connectTimeout:1000});
void configuredAgent;
import jwa from 'vjwa';
import jws from 'vjws';
import jwt from 'vjsonwebtoken';
import jwks from 'vjwks-rsa';
const jwksClient = jwks({fetcher:async()=>({keys:[]})});
const signingKey: Promise<jwks.SigningKey> = jwksClient.getSigningKey('archive');
void signingKey;
const jwtToken: string = jwt.sign({sub:'student'}, 'key', {expiresIn:'2h'});
const jwtResult: jwt.Jwt = jwt.verify(jwtToken, 'key', {complete:true});
jwt.verify(jwtToken, (header, done) => { const kid: string | undefined = header.kid; done(null, 'key'); void kid; },
  {complete:true}, (error, value) => { const header: jwt.JwtHeader | undefined = value?.header; void [error,header]; });
void jwtResult;
const algorithm: jwa.Algorithm = 'HS256';
const jwsToken: string = jws.sign({header:{alg:'HS256'},payload:'archive',secret:'key'});
const jwsValid: boolean = jws.verify(jwsToken, 'HS256', 'key');
const jwsDecoded: jws.Decoded | null = jws.decode(jwsToken);
const signed: string = jwa(algorithm).sign({sub:'archive'}, 'key');
const jwtSignatureVerified: boolean = jwa(algorithm).verify({sub:'archive'}, signed, 'key');
const empty: '' = jwa('none').sign();
// @ts-expect-error algorithms are case-sensitive
jwa('hs256');
// @ts-expect-error a signed algorithm requires key material
jwa('RS256').sign('message');
import { http as registerHttp, cloudEvent as registerCloudEvent } from 'vfunctions-framework';
import { getFunction, getTestServer } from 'vfunctions-framework/testing';
registerHttp('archive', (req, res) => res.send(req.rawBody?.toString()));
registerCloudEvent<{value:number}>('event', event => event.data?.value);
getFunction('archive');
getTestServer('archive').listen(0).close();

import {readPackageUp, readPackageUpSync, PackageJsonError, type PackageJson} from 'vread-package-up';
const manifestResult = readPackageUpSync({cwd:'.',stopAt:'.',normalize:false});
if (manifestResult) { const manifest: PackageJson = manifestResult.packageJson; const rawName: unknown = manifest.name; }
void readPackageUp({cwd:'.',normalize:false});
// @ts-expect-error metadata normalization is unsupported
readPackageUp({normalize:true});
// @ts-expect-error package fields are unvalidated JSON values
const manifestName: string = manifestResult!.packageJson.name;
import parseArguments, { type Options as ArgumentOptions } from 'vminimist';
const argumentOptions: ArgumentOptions = {string:['port'] as const,alias:{port:['p'] as const}};
const argumentsResult = parseArguments(['--port=8080'] as const, argumentOptions);
const argumentValue: unknown = argumentsResult.port;
// @ts-expect-error malformed arguments are rejected
parseArguments([{}]);
// @ts-expect-error dynamic results require narrowing
const argumentPort: string = argumentsResult.port;
import cors, { type Options as CorsOptions } from 'vcors';
const corsOptions: CorsOptions = {origin:['https://ventimath.com',/example/g] as const,allowedHeaders:['Authorization'] as const,credentials:true};
cors(corsOptions);
cors((req,callback)=>callback(null,{origin:req.headers.origin === 'https://ventimath.com'}));
// @ts-expect-error credentials must be boolean
cors({credentials:'true'});
import express, { json as expressJson, Router as ExpressRouter } from 'vexpress';
const app = express();
app.use(cors(corsOptions));
app.use(expressJson());
app.get('/users/:id', (req, res) => res.status(201).json({ id: req.params.id, query: req.query }));
app.use('/child', ExpressRouter().get('/', (req, res) => res.send('ok')));
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => res.status(500).send(error.message));
// @ts-expect-error status must be a number
app.response.status('200');
// @ts-expect-error invalid middleware
app.get('/bad', 123);
import Router, { Route as RouterRoute } from 'vrouter';
import depd from 'vdepd';
const router = new Router();
router.get('/:id', (req, res, next) => { const id: string | string[] | undefined = req.params.id; res.end(String(id)); next(); });
router.use('/x', [(req, res, next) => next()]);
new Router.Route('/').get((req, res) => res.end(req.url));
new RouterRoute('/').get((req, res) => res.end(req.url));
// @ts-expect-error invalid handler
router.get('/x', false);
// @ts-expect-error invalid options
Router({ strict: 'no' });
const warn = depd('archive'); warn('message');
class DeprecatedClass { constructor(readonly value: number) {} }
const WrappedClass = warn.function(DeprecatedClass);
const constructed: DeprecatedClass = new WrappedClass(2);
const deprecatedCallback = warn.function((value: number) => String(value));
const deprecatedResult: string = deprecatedCallback(3);
warn.property({ x: 1 }, 'x');
// @ts-expect-error callable or constructable required
warn.function(1);
void [constructed, deprecatedResult];
import route, { match as matchRoute, compile as compileRoute, TokenData, type PathInput } from 'vpath-to-regexp';
const routeData = new TokenData([{type:'param',name:'id'}] as const);
const routeInputs: PathInput = ['/users/:id', [routeData]] as const;
const routeMatch = matchRoute(routeInputs)('/users/x');
if (routeMatch) { const id: string | readonly string[] | undefined = routeMatch.params.id; void id; }
const routeUrl: string = compileRoute('/files/*path')({path:['a','b'] as const});
// @ts-expect-error invalid decoder option
route.match('/x', {decode:true});
void routeUrl;
import proxyaddr, { all as allProxyAddresses, compile as compileTrust } from 'vproxy-addr';
const proxyRequest: proxyaddr.Request = { headers: {}, socket: {} };
const trustProxy: proxyaddr.CompiledTrust = compileTrust(['loopback'] as const);
const proxyAddress: string | undefined = proxyaddr(proxyRequest, trustProxy);
const proxyChain: proxyaddr.Addresses = allProxyAddresses(proxyRequest);
// @ts-expect-error unknown peer must be allowed
const definiteProxyAddress: string = proxyaddr(proxyRequest, trustProxy);
// @ts-expect-error raw boolean policies belong to Express
allProxyAddresses(proxyRequest, false);
void [proxyAddress, proxyChain, definiteProxyAddress];
import ipaddr, { IPv4, IPv6, type RangeList } from 'vipaddr';
const ip4: IPv4 = new IPv4(new Uint8Array([127, 0, 0, 1]));
const ip6: IPv6 = IPv6.parse('::1');
const ranges: RangeList = { mixed: [IPv4.parseCIDR('127.0.0.0/8'), IPv6.parseCIDR('::1/128')] };
const rangeName: string | false = ipaddr.subnetMatch(ip6, ranges, false as const);
// @ts-expect-error families must match
ip4.match(ip6, 32);
// @ts-expect-error immutable address property
ip4.octets = [];
// @ts-expect-error required prefix
ip6.match(ip6);
void [rangeName];
import forwarded from 'vforwarded';
const chain: forwarded.Addresses = forwarded({ headers: { 'x-forwarded-for': '::1' }, socket: {} });
// @ts-expect-error unavailable socket address
const peer: string = chain[0];
// @ts-expect-error header must be a string
forwarded({ headers: { 'x-forwarded-for': ['::1'] }, socket: {} });
void [chain, peer];
import once, { strict } from 'vonce';
import merge from 'vmerge-descriptors';
const callback = Object.assign(function(this: { n: number }, x: number) { return this.n + x; }, { label: 'callback' });
const wrapped = once(callback);
const onceResult: number | undefined = wrapped.call({ n: 1 }, 2);
const onceLabel: string = wrapped.label;
const strictResult: number = strict(callback).call({ n: 1 }, 2);
// @ts-expect-error read-only status
wrapped.called = false;
// @ts-expect-error wrong argument
wrapped.call({ n: 1 }, '2');
const symbol = Symbol();
const merged = merge({ value: 1 }, { value: 'new', [symbol]: 3 });
const mergedValue: string = merged.value;
const symbolValue: number = merged[symbol];
const keptValue: number = merge({ value: 1 }, { value: 'new' }, false).value;
const callable = merge((n: number) => n + 1, { label: 'function' });
const called: number = callable(2);
// @ts-expect-error copying descriptors cannot make an object callable
merge({}, () => 1)();
void [onceResult, onceLabel, strictResult, mergedValue, symbolValue, keptValue, called];
import signature, { sign, unsign, type Secret } from 'vcookie-signature';
const secret: Secret = new Uint8Array([1, 2, 3]);
const verified: string | false = unsign(sign('value', secret), secret);
signature.sign('value', new DataView(new ArrayBuffer(3)));
// @ts-expect-error key is required
sign('value');
// @ts-expect-error verification can fail
const invalidVerified: string = verified;
import vary, { append } from 'vvary';
const varied: string = append('Accept', ['Origin']);
vary({ getHeader: () => undefined, setHeader(_name, _value) {} }, 'Origin');
// @ts-expect-error nonstring fields
append('', [1]);
void [invalidVerified, varied];

import cookie, { parseCookie, stringifyCookie, parseSetCookie, stringifySetCookie, serialize, type SetCookie } from 'vcookie';
const setCookie: SetCookie = parseSetCookie('sid=value; Secure');
const cookieText: string = stringifySetCookie(setCookie);
const cookieValue: string | undefined = parseCookie(stringifyCookie({ sid: '雪' })).sid;
cookie.parse(serialize('sid', 'value'));
// @ts-expect-error string value required
serialize('sid', 1);
// @ts-expect-error typed flags
stringifySetCookie({ name: 'sid', secure: 'false' });
void [cookieText, cookieValue];

import disposition, { create as createDisposition, parse as parseDisposition, format as formatDisposition, type ContentDisposition } from 'vcontent-disposition';
const parsedDisposition: ContentDisposition = parseDisposition(createDisposition('雪.txt'));
const dispositionText: string = disposition.format(parsedDisposition);
// @ts-expect-error disposition type is required
formatDisposition({});
// @ts-expect-error filenames must be strings
createDisposition(1);
void dispositionText;

import bodyParser, { json as jsonBody, raw as rawBody, text as textBody, urlencoded as formBody } from 'vbody-parser';
import jsonParser from 'vbody-parser/json';
import rawParser from 'vbody-parser/raw';
import textParser from 'vbody-parser/text';
import formParser from 'vbody-parser/urlencoded';
declare const bodyRequest: bodyParser.Request;
const middleware: bodyParser.Middleware = jsonParser({ verify(_req, _res, buffer, charset) {
  const data: Uint8Array = buffer;
  const encoding: string | null = charset;
  buffer.toString('hex'); void [data, encoding];
} });
middleware(bodyRequest, {}, error => { void error; });
rawParser(); textParser(); formParser({ extended: true, parameterLimit: 2 ** 32 });
jsonBody(); rawBody(); textBody(); formBody();
// @ts-expect-error limits must be numbers
formParser({ parameterLimit: '1000' });
// @ts-expect-error verify receives bytes, not a string
jsonBody({ verify(_req, _res, buffer: string) {} });
import qs, { parse as parseQuery, stringify, formats } from 'vqs';
const parsedQuery: qs.ParsedObject = parseQuery('a=1', { parameterLimit: 2 });
const queryText: string = stringify({ a: ['x', 'y'] }, { format: formats.WHATWG });
// @ts-expect-error a parsed field can be an array or object
const scalarQuery: string = parsedQuery.a;
// @ts-expect-error limits require numbers
parseQuery('a=1', { depth: '2' });
void [queryText, scalarQuery];
import getRawBody from 'vraw-body';
declare const stream: getRawBody.ReadableStream;
const raw: Promise<Uint8Array> = getRawBody(stream);
const rawText: Promise<string> = getRawBody(stream, true);
getRawBody(stream, (error, buffer) => { if (!error) buffer.toString('hex'); });
// @ts-expect-error encoding must be a string or boolean
getRawBody(stream, { encoding: 3 });
void [raw, rawText];
import iconv, { encode, decode, type Encoding } from 'viconv-lite';
const charset: Encoding = 'utf8';
const encoded: Uint8Array = encode('abc', charset);
const decoded: string = decode(encoded, 'UTF-8');
encode('abc', 'utf8').toString('hex');
iconv.decodeStream('utf16be').collect((error, output) => { if (!error) output?.toUpperCase(); });
iconv.encodeStream('utf8').pipe(iconv.decodeStream('utf8'));
// @ts-expect-error decoding requires bytes
decode('abc', 'utf8');
void decoded;
import bytes, { parse as parseBytes, format as formatBytes } from 'vbytes';
const size: number = parseBytes('1kb');
const absent: null = parseBytes(undefined);
const sizeText: string | null = bytes(size, { unit: 'KB' });
const sizeOptions: bytes.Options = { decimalPlaces: 4 };
formatBytes(size, sizeOptions);
// @ts-expect-error byte sizes must be strings or numbers
parseBytes({});
void [absent, sizeText];
import media, { parse, format, test, type MediaType } from 'vmedia-typer';
import typeis, { is, match, hasBody, normalize } from 'vtype-is';
const parsed: MediaType = parse('text/html');
const header: string = format(parsed);
const result: string | false | null = typeis({ headers: { 'content-length': '0', 'content-type': header } }, ['html'] as const);
const matched: boolean = match('text/*', header);
const normalized: string | false = normalize('html');
is(header, 'html', 'json'); hasBody({ headers: {} }); test(media.format(parsed));
// @ts-expect-error subtype is required
format({ type: 'text' });
// @ts-expect-error patterns must be strings
is(header, [1]);
void [result, matched, normalized];
import Negotiator, { Negotiator as NamedNegotiator } from 'vnegotiator';
import Accepts from 'vaccepts';
const request = { headers: { accept: 'text/html' } };
const negotiator: Negotiator.Instance = new NamedNegotiator(request);
const encoding: string | undefined = negotiator.encoding(['gzip'], { preferred: ['gzip'] });
const accepts: Accepts.Instance = Accepts(request);
const accepted: string | false = accepts.types(['html', 'json'] as const);
const all: string[] = accepts.types();
// @ts-expect-error values must be strings
accepts.types([1]);
void [encoding, accepted, all];
`;
  for (const extension of ['cts', 'mts']) fs.writeFileSync(path.join(directory, 'consumer.' + extension), (extension==='cts'?"import StrictBuilder = require('vfast-xml-builder');const strictXML:string=new StrictBuilder().build({r:'x'});void strictXML;\n":'')+source);
  fs.writeFileSync(path.join(directory, 'browser-consumer.mjs'), `
import depd from 'vdepd';
const warn = depd('browser'), fn = value => value, object = { x: 1 };
if (warn.function(fn) !== fn) throw Error('browser wrapper must return original');
warn.property(object, 'x');
if (Object.getOwnPropertyDescriptor(object, 'x').value !== 1) throw Error('browser property was changed');
globalThis.browserChecked = true;
`);
  fs.writeFileSync(path.join(directory, 'tsconfig.json'), JSON.stringify({ files: ['consumer.cts', 'consumer.mts'], compilerOptions: {
    strict: true, noEmit: true, target: 'ES2022', lib: ['ES2022'], types: [], skipLibCheck: false,
    module: 'NodeNext', moduleResolution: 'NodeNext',
  } }));
  fs.writeFileSync(path.join(directory, 'native-agent.cts'), "import {Agent as TypedAgent, type AgentConnectOpts, type ClientRequest as AgentRequest} from 'vagent-base';\nimport * as agentNet from 'node:net';\nimport * as agentHttp from 'node:http';\nclass DirectAgent extends TypedAgent { connect(_request: AgentRequest, options: AgentConnectOpts) { return agentNet.connect(options); } }\nconst nativeAgent: agentHttp.Agent = new DirectAgent({connectTimeout:1000});\nvoid nativeAgent;\n\n");
  fs.writeFileSync(path.join(directory, 'native-agent.json'), JSON.stringify(require('./platform-types.cjs').configuration([path.join(directory, 'native-agent.cts')])));
  for (const manager of ['npm', 'bun']) {
    // Bun resolves transitive version requests through the registry unless the
    // unpublished package names are explicitly redirected to these archives.
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({
      name: 'vpm-media-archive-consumer', private: true, dependencies,
      ...(manager === 'bun' ? { overrides: dependencies } : {}),
    }));
    run(manager, manager === 'npm'
      ? ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', path.join(directory, 'npm-cache')]
      : ['install', '--ignore-scripts']);
    assert.ok(fs.statSync(path.join(directory, 'node_modules/vfunctions-framework/lib/main.js')).mode & 0o111);
    assert.ok(fs.statSync(path.join(directory,'node_modules/vmime/bin/vmime.cjs')).mode & 0o111);
    for(const runtime of [process.execPath,'bun'])assert.equal(run(runtime,['node_modules/vmime/bin/vmime.cjs','--reverse','image/jpeg']),'jpg\n');
    for (const runtime of [process.execPath, 'bun']) {
      const cli = spawnSync(runtime, ['node_modules/vfunctions-framework/lib/main.js', '--help'], { cwd: directory, encoding: 'utf8' });
      assert.equal(cli.status, 0, cli.stderr);
      assert.match(cli.stderr, /vfunctions-framework --target/);
    }
    for (const runtime of [process.execPath, 'bun']) for (const extension of ['cjs', 'mjs']) run(runtime, ['consumer.' + extension]);
    run(process.execPath, ['--conditions=browser', 'browser-consumer.mjs']);
    run('bun', ['build', 'browser-consumer.mjs', '--target=browser', '--format=iife', '--outfile=browser-bundle.js']);
    const browserContext = {};
    require('node:vm').runInNewContext(fs.readFileSync(path.join(directory, 'browser-bundle.js'), 'utf8'), browserContext);
    assert.equal(browserContext.browserChecked, true);
    const tsc = compiler();
    const output = run(process.execPath, [tsc.path, '-p', 'tsconfig.json', '--listFiles', '--pretty', 'false']);
    assert.doesNotMatch(output, /\/packages\/|\/vnode-types\/|\/v?undici-types\/|lib\.dom/);
    assert.match(output, /node_modules\/vfunctions-framework\/testing\.d\.ts/);
    assert.match(output, /node_modules\/vmedia-typer\/index\.d\.ts/);
    assert.match(output, /node_modules\/vtype-is\/index\.d\.ts/);
    assert.match(output, /node_modules\/vnegotiator\/index\.d\.ts/);
    assert.match(output, /node_modules\/vaccepts\/index\.d\.ts/);
    assert.match(output, /node_modules\/vbytes\/index\.d\.ts/);
    assert.match(output, /node_modules\/viconv-lite\/index\.d\.ts/);
    assert.match(output, /node_modules\/vraw-body\/index\.d\.ts/);
    assert.match(output, /node_modules\/vrouter\/index\.d\.ts/);
    assert.match(output, /node_modules\/vdepd\/index\.d\.ts/);
    assert.match(output, /node_modules\/vpath-to-regexp\/index\.d\.ts/);
    assert.match(output, /node_modules\/vproxy-addr\/index\.d\.ts/);
    assert.match(output, /node_modules\/vipaddr\/index\.d\.ts/);
    assert.match(output, /node_modules\/vforwarded\/index\.d\.ts/);
    assert.match(output, /node_modules\/vonce\/index\.d\.ts/);
    assert.match(output, /node_modules\/vmerge-descriptors\/index\.d\.ts/);
    assert.match(output, /node_modules\/vcookie-signature\/index\.d\.ts/);
    assert.match(output, /node_modules\/vjwa\/index\.d\.ts/);
    assert.match(output, /node_modules\/vjws\/index\.d\.ts/);
    assert.match(output, /node_modules\/vjsonwebtoken\/index\.d\.ts/);
    assert.match(output, /node_modules\/vagent-base\/index\.d\.ts/);
    assert.match(output, /node_modules\/vjwks-rsa\/index\.d\.ts/);
    assert.match(output, /node_modules\/vvary\/index\.d\.ts/);
    assert.match(output, /node_modules\/vcookie\/index\.d\.ts/);
    assert.match(output, /node_modules\/vcontent-disposition\/index\.d\.ts/);
    assert.match(output, /node_modules\/vqs\/index\.d\.ts/);
    assert.match(output, /node_modules\/vbody-parser\/index\.d\.ts/);
    const nativeOutput = run(process.execPath, [tsc.path, '-p', 'native-agent.json', '--listFiles', '--pretty', 'false']);
    assert.match(nativeOutput, /node_modules\/vagent-base\/index\.d\.ts/);
    console.log(`${manager} archives: Node/Bun CJS and ESM, TypeScript ${tsc.version} CJS and ESM without platform types passed.`);
    fs.rmSync(path.join(directory, 'node_modules'), { recursive: true, force: true });
    fs.rmSync(path.join(directory, 'package-lock.json'), { force: true });
  }
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
