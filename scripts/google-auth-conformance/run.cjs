'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {createRequire} = require('node:module');
const {spawnSync} = require('node:child_process');
const {compiler} = require('../platform-types.cjs');
const root = path.resolve(__dirname, '../..');
const fixture = path.join(__dirname, 'upstream-11.3.2');
const upstream = process.argv.includes('--upstream');
const modules = path.join(root, 'scripts/google-http-conformance/node_modules');
const resolve = createRequire(path.join(modules, 'google-auth11/package.json')).resolve;
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vgoogle-auth-conformance-'));
const selected = ['authclient','compute','crypto','googleauth','iam','idtokenclient','impersonated','index','jwt','jwtaccess','loginticket','oauth2','oauth2common','passthroughclient','refresh','util'];
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {encoding:'utf8', maxBuffer:8*1024*1024, timeout:180000, ...options});
  if (result.status !== 0) console.log(result.stdout + result.stderr);
  assert.equal(result.status, 0, String(result.error || result.signal || 'Failed'));
  return result.stdout;
}
try {
  assert.equal(require(path.join(modules,'google-auth11/package.json')).version, '11.3.2');
  for (const [file, hash] of Object.entries(require('./upstream-11.3.2/SHA256.json'))) {
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(fixture, file))).digest('hex'), hash, file);
  }
  fs.cpSync(path.join(fixture,'test'), path.join(temporary,'test'), {recursive:true});
  for (const name of ['goodlink','badlink','emptylink']) {
    const file = path.join(temporary,'test/fixtures',name), target = fs.readFileSync(file,'utf8');
    fs.unlinkSync(file); fs.symlinkSync(target,file);
  }
  fs.symlinkSync(modules, path.join(temporary,'node_modules'),'dir');
  const replacements = {
    nock: path.join(modules,'nock14'), sinon:path.join(modules,'sinon21'),
    gaxios: upstream ? resolve('gaxios') : path.join(root,'packages/vgaxios'),
    'gcp-metadata': upstream ? resolve('gcp-metadata') : path.join(root,'packages/vgcp-metadata'),
    'google-logging-utils': upstream ? resolve('google-logging-utils') : path.join(root,'packages/vgoogle-logging-utils'),
    jws: upstream ? resolve('jws') : path.join(root,'packages/vjws'),
  };
  const files = [];
  for (const file of fs.readdirSync(path.join(temporary,'test'),{recursive:true})) {
    if (!file.endsWith('.ts.txt')) continue;
    const sourceFile = path.join(temporary,'test',file), target = sourceFile.slice(0,-4);
    let source = fs.readFileSync(sourceFile,'utf8');
    // Preserve mutable/callable CommonJS namespaces under TypeScript 7.
    source = source.replace(/import \* as (\w+) from '([^']+)';/g, 'import $1 = require("$2");');
    source = source.replace(/\.replyWithError\((\{[^{}]*\})\)/g, '.replyWithError(Object.assign(new Error("Mock network error"), $1))');
    if (!upstream && file === 'test.jwtaccess.ts.txt') {
      source=source.replace('cacheKey, `${testUri}_${scopes}`',"cacheKey, 's' + JSON.stringify([testUri, scopes])")
        .replace("cacheKey, `${testUri}_${scopes.join('_')}`","cacheKey, 's' + JSON.stringify([testUri, scopes.join(' ')])")
        .replace('cacheKey, testUri',"cacheKey, 'u' + testUri");
    }
    source = require('./adapt.cjs')(file, source, upstream);
    fs.writeFileSync(target,source); fs.unlinkSync(sourceFile); files.push(path.relative(temporary,target));
  }
  fs.writeFileSync(path.join(temporary,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'CommonJS',esModuleInterop:true,noCheck:true,noResolve:true,outDir:'compiled',rootDir:'.'},files}));
  run(process.execPath,[compiler().path,'-p',path.join(temporary,'tsconfig.json')]);
  fs.symlinkSync(path.join(root,upstream?'scripts/google-http-conformance/node_modules/google-auth11/build/src':'packages/vgoogle-auth-library/lib'),path.join(temporary,'compiled/src'),'dir');
  for (const file of fs.readdirSync(path.join(temporary,'compiled/test'),{recursive:true})) {
    if (!file.endsWith('.js')) continue;
    const target = path.join(temporary,'compiled/test',file);
    let source = fs.readFileSync(target,'utf8');
    for (const [name,replacement] of Object.entries(replacements)) source=source.replaceAll('require("'+name+'")','require('+JSON.stringify(replacement)+')');
    source = require('./adapt.cjs')(file, source, upstream);
    fs.writeFileSync(target,source);
  }
  const env={...process.env};
  for (const key of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy','GCE_METADATA_HOST','GCE_METADATA_IP','METADATA_SERVER_DETECTION','GOOGLE_APPLICATION_CREDENTIALS','GOOGLE_CLOUD_PROJECT','GCLOUD_PROJECT','GOOGLE_SDK_NODE_LOGGING']) delete env[key];
  const tests=(process.env.AUTH_SUITES ? process.env.AUTH_SUITES.split(',') : selected).map(name=>'compiled/test/test.'+name+'.js');
  if(!process.env.AUTH_SUITES)tests.push('compiled/test/gtoken/test.*.js');
  console.log(run(process.execPath,[path.join(modules,'mocha/bin/mocha.js'),'--no-config','--no-package','--timeout','10000','--reporter','dot',...tests],{cwd:temporary,env}));
} finally {
  if(process.env.KEEP_AUTH_FIXTURE) console.log(temporary);
  else fs.rmSync(temporary,{recursive:true,force:true});
}
