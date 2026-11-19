'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const fixture = fs.mkdtempSync(path.join(__dirname, 'node_modules', '.map-caller-'));
const own = process.env.VSOURCE_MAP_PACKAGE || path.resolve(__dirname, '../../packages/vsource-map-js');
async function exercise(implementation, label) {
  const modules = path.join(fixture, label, 'node_modules');
  fs.mkdirSync(modules, {recursive:true});
  for (const name of ['css-tree','postcss']) fs.cpSync(path.join(__dirname,'node_modules',name),path.join(modules,name),{recursive:true});
  fs.symlinkSync(implementation, path.join(modules,'source-map-js'), 'dir');
  const load = createRequire(path.join(modules,'postcss/package.json'));
  assert.equal(fs.realpathSync(load.resolve('source-map-js')),require.resolve(implementation));
  const postcss = load('postcss'), tree = load('css-tree');
  const sheet = '.warml { color: red; }\n.hmmt { color: blue; }';
  const input = {from:'/contest/src/scores.css', to:'/contest/build/first.css', map:{inline:false,annotation:false}};
  const plugin = { postcssPlugin:'test-colors', Declaration(d){if(d.value==='red') d.value='green'} };
  const first = await postcss([plugin]).process(sheet,input);
  const second = await postcss([plugin]).process(first.css,{from:input.to,to:'/contest/dist/site.css',map:{prev:first.map.toJSON(),inline:false,annotation:false}});
  const diagnostic = postcss.parse(first.css,{from:input.to,map:{prev:first.map.toJSON()}}).last.first.error('test');
  const cssTree = tree.generate(tree.parse(sheet,{positions:true,filename:'scores.css'}),{sourceMap:true});
  const inline = await postcss([plugin]).process(sheet,{...input,map:{inline:true}});
  return [first.map.toJSON(),second.map.toJSON(),diagnostic.line,diagnostic.column,diagnostic.file,cssTree.css,cssTree.map.toJSON(),inline.css];
}
(async()=>{try{
  const actual=await exercise(own,'own');
  for (const alias of ['source-map-js','source-map-app'])
    assert.deepEqual(actual,await exercise(path.dirname(require.resolve(alias+'/package.json')),alias),alias);
  console.log('PostCSS generation, inline output, chained maps, original diagnostics and CSS Tree generation match both versions');
} finally {fs.rmSync(fixture,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});
