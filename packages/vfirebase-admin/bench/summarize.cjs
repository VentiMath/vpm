'use strict';
const path = require('node:path');
require('node:child_process').execFileSync(process.execPath, [path.resolve(__dirname, '../../../scripts/render-bench-report.cjs'), path.resolve(__dirname, '..')], {stdio: 'inherit'});
