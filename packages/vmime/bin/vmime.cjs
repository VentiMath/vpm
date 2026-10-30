#!/usr/bin/env node
'use strict';
const args = process.argv.slice(2), metadata = require('../package.json');
const has = (...flags) => flags.some(flag => args.includes(flag));
if (has('--version', '-v', '--v')) console.log(metadata.version);
else if (has('--name', '-n', '--n')) console.log(metadata.name);
else if (has('--help', '-h', '--h')) console.log('vmime — file-extension MIME lookup\n\nUsage: vmime [path_or_extension]\n       vmime --reverse <content_type>\n\nFlags: --help (-h), --version (-v), --name (-n), --reverse (-r)');
else {
  const mime = require('../index.js');
  const result = has('--reverse', '-r') ? mime.getExtension(args.at(-1)) : mime.getType(args[0]);
  if (result) console.log(result);
  else process.exitCode = 1;
}
