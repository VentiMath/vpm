'use strict';
process.env.NODE_ENV='production';
const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base=path.resolve(root,'../../scripts/mui-system-conformance/node_modules/.vpm-material');
const cases=[];
for(const version of ['app','current'])for(const kind of ['pagination','tabs','auto'])cases.push({
 name:(version==='app'?'App7 ':'Material9 ')+kind+' SSR',
 make(file){const render=require(base+'/'+version+'-'+(file===root?'vpm':'upstream')+'/consumer-gaps-ssr.cjs').render;let i=0;return()=>render({kind,...(kind==='tabs'?{value:i++%8}:kind==='pagination'?{page:i++%3}:{inputValue:i++%2?'A':'S'})})},
 validate(html){assert.ok(html.includes(kind==='pagination'?'MuiTablePagination-root':kind==='tabs'?'tablist':'combobox'))}
});
require('../../../scripts/bench-process.cjs').run({root,upstream:path.resolve(root,'../../scripts/mui-system-conformance/node_modules/@mui/material'),vpm:root,cases,files:['table-pagination.cjs','tab-navigation.cjs','autocomplete-hook.cjs','option-filter.cjs','fade-control.cjs','focus-trap.cjs','bench/consumer-gaps.cjs','../../scripts/mui-material-conformance/consumer-gaps-scene.jsx','../../scripts/mui-material-conformance/consumer-gaps-build.cjs',...['app-upstream','app-vpm','current-upstream','current-vpm'].map(name=>'../../scripts/mui-system-conformance/node_modules/.vpm-material/'+name+'/consumer-gaps-ssr.cjs'),'../../scripts/mui-system-conformance/package-lock.json']}).catch(e=>{console.error(e);process.exitCode=1});
