'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os'),
  vm = require('node:vm'),
  assert = require('node:assert/strict');
const source = fs.readFileSync(require.resolve('@capacitor/cli/dist/ios/build.js'), 'utf8');
async function probe(rimraf, scheme, packageManager) {
  const cwd = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vrimraf-capacitor-')));
  try {
    const archive = path.join(cwd, scheme + '.xcarchive');
    fs.mkdirSync(archive + '/Products/Applications', { recursive: true });
    fs.writeFileSync(archive + '/Products/Applications/App', 'archive');
    fs.mkdirSync(cwd + '/output');
    fs.writeFileSync(cwd + '/output/App.ipa', 'exported');
    fs.writeFileSync(cwd + '/keep', 'keep');
    const tasks = [],
      commands = [],
      messages = [],
      module = { exports: {} };
    const stubs = {
      'fs-extra': fs,
      path,
      rimraf,
      '../common': {
        runTask: async (name, fn) => {
          tasks.push(name);
          return fn();
        },
      },
      '../definitions': { XcodeExportMethod: { AppStoreConnect: 'app-store-connect' } },
      '../log': { logSuccess: (m) => messages.push(m) },
      '../util/subprocess': { runCommand: async (...args) => commands.push(args) },
    };
    vm.runInNewContext(
      '(function(require,exports,module){' + source + '\n})',
      {},
      { filename: 'capacitor-ios-build.js' },
    )(
      (name) => {
        assert(Object.hasOwn(stubs, name), 'Unexpected caller import ' + name);
        return stubs[name];
      },
      module.exports,
      module,
    );
    await module.exports.buildiOS(
      {
        app: { appId: 'test.example' },
        ios: {
          packageManager,
          nativeProjectDirAbs: cwd,
          nativeXcodeWorkspaceDirAbs: cwd + '/App.xcworkspace',
          nativeXcodeProjDirAbs: cwd + '/App.xcodeproj',
        },
      },
      { scheme, configuration: 'Release', xcodeSigningType: 'automatic' },
    );
    assert.equal(commands.length, 2);
    assert.equal(commands[0][0], 'xcodebuild');
    assert.deepEqual(tasks, ['Building xArchive', 'Building IPA', 'Cleaning up']);
    assert.equal(messages.length, 1);
    assert(!fs.existsSync(archive));
    assert(!fs.existsSync(cwd + '/archive.plist'));
    assert.equal(fs.readFileSync(cwd + '/output/App.ipa', 'utf8'), 'exported');
    assert.equal(fs.readFileSync(cwd + '/keep', 'utf8'), 'keep');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
}
(async () => {
  for (const library of [
    require('rimraf'),
    require('rimraf-app'),
    require(process.env.VPM_RIMRAF_PACKAGE || '../../packages/vrimraf'),
  ])
    for (const scheme of ['App', 'Venti Math'])
      for (const manager of ['SPM', 'CocoaPods']) await probe(library, scheme, manager);
  console.log(
    '12 unchanged Capacitor 8.2.0 iOS cleanup runs pass; Xcode/signing/export stubbed, all files temporary.',
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
