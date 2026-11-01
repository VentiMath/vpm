#!/usr/bin/env node
'use strict';
async function main() {
  const directory = process.argv[2] || '.';
  if (directory === '-h' || directory === '--help') {
    console.error('Usage: firebase-functions [functionsDir]\n\nArguments:\n  - functionsDir: Directory containing source code for Firebase Functions.');
    process.exitCode = 1; return;
  }
  const output = process.env.FUNCTIONS_MANIFEST_OUTPUT_PATH;
  if (output) {
    const {loadStack} = require('../runtime/loader.js'), {stackToWire} = require('../runtime/manifest.js');
    const manifest = stackToWire(await loadStack(directory));
    await require('node:fs/promises').writeFile(output, JSON.stringify(manifest, null, 2));
    return;
  }
  const port = process.env.PORT ? Number.parseInt(process.env.PORT) : 8080;
  const server = require('../runtime/discovery-server.js').createDiscoveryServer(directory, process.env.FUNCTIONS_CONTROL_API === 'true');
  server.on('error', error => {console.error(error); process.exitCode = 1;});
  server.listen(port, () => console.log('Serving at port', server.address().port));
}
main().catch(error => {
  console.error('Failed to generate manifest from function source: ' + (error?.message || String(error)));
  process.exitCode = 1;
});
