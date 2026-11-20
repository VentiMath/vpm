'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const fixture = fs.mkdtempSync(path.join(__dirname, 'node_modules', '.varint-'));
const modules = path.join(fixture, 'node_modules');
const source = '$gap: 4px; .editor { .toolbar { gap: $gap * 2; } }';
async function main() {
  fs.mkdirSync(modules);
  fs.cpSync(path.join(__dirname,'node_modules/sass-embedded'), path.join(modules,'sass-embedded'), {recursive:true});
  const codec=process.env.VVARINT_PACKAGE || path.resolve(__dirname, '../../packages/vvarint');
  fs.symlinkSync(codec, path.join(modules,'varint'), 'dir');
  if(process.env.VBUFFER_BUILDER_PACKAGE) fs.symlinkSync(path.resolve(process.env.VBUFFER_BUILDER_PACKAGE),path.join(modules,'buffer-builder'),'dir');
  const load=createRequire(path.join(modules,'sass-embedded/package.json'));
  assert.equal(fs.realpathSync(load.resolve('varint')), require.resolve(codec));
  if(process.env.VBUFFER_BUILDER_PACKAGE)assert.equal(fs.realpathSync(load.resolve('buffer-builder')),require.resolve(path.resolve(process.env.VBUFFER_BUILDER_PACKAGE)));
  const control=require('sass-embedded'), own=load('sass-embedded');
  const expected=control.compileString(source).css;
  assert.match(expected, /gap: 8px/);
  assert.equal(own.compileString(source).css, expected);
  const compiler=await own.initAsyncCompiler();
  try {
    const sheets=await Promise.all(Array.from({length:132},(_,i)=>compiler.compileStringAsync(source+'.sheet-'+i+' { z-index: '+i+'; }')));
    sheets.forEach((sheet,i)=>{assert.ok(sheet.css.startsWith(expected));assert.ok(sheet.css.includes('z-index: '+i+';'));});
  } finally {await compiler.dispose();}
  console.log('Sass 1.86.3 sync compile and 132 concurrent compiler replies match their requests');
}
main().finally(()=>fs.rmSync(fixture,{recursive:true,force:true})).catch(e=>{console.error(e);process.exitCode=1;});
