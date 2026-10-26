'use strict';
const compare = require('../../../scripts/compare.cjs');
const fs = require('node:fs');
const path = require('node:path');
const before = JSON.parse(fs.readFileSync(path.join(__dirname, '../db.json'), 'utf8'));
const after = require('..');
const inputs = ['text/html', 'application/json', 'image/png', 'application/zip', 'text/x-unknown'];
compare([
  { name: 'record source', inputs, before: type => before[type]?.source, after: type => after[type]?.source },
  { name: 'first extension', inputs, before: type => before[type]?.extensions?.[0], after: type => after[type]?.extensions?.[0] },
]);
