'use strict';
const args=process.argv.slice(2),take=k=>args[args.indexOf(k)+1];
require('node:assert/strict').ok(['--ref','--tag','--out'].every(k=>args.includes(k)));
require('./pack-vlx-release.cjs').build({ref:take('--ref'),tag:take('--tag'),out:take('--out'),packageName:'vresvg',tagPrefix:'resvg',installName:'@resvg/resvg-js',names:['vresvg','vpngjs']});
