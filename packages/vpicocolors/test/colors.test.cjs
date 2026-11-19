'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),pc=require(process.env.VPICOCOLORS_ENTRY||'../index.cjs'),c=pc.createColors(true);
test('standard foreground/background/brightness and emphasis escapes',()=>{assert.equal(c.red('x'),'\x1b[31mx\x1b[39m');assert.equal(c.bgBlueBright(2),'\x1b[104m2\x1b[49m');assert.equal(c.bold(null),'\x1b[1mnull\x1b[22m');assert.equal(c.gray(''),c.blackBright(''));});
test('disabled formatters coerce without emitting escapes',()=>{const d=pc.createColors(false);assert.equal(d.isColorSupported,false);for(const [k,f]of Object.entries(d))if(typeof f==='function')for(const x of ['',3,null,undefined])assert.equal(f(x),String(x),k);});
test('nested styles restore outer formatting',()=>{assert.equal(c.red('before '+c.blue('inside')+' after'),'\x1b[31mbefore \x1b[34minside\x1b[31m after\x1b[39m');assert.equal(c.bold(c.dim('x')+' y'),'\x1b[1m\x1b[2mx\x1b[22m\x1b[1m y\x1b[22m');});
test('closing escapes at the start or in a short prefix reopen the style',()=>{for(const text of ['\x1b[39mrest','a\x1b[39mb','abc\x1b[39md'])assert.equal(c.red(text),'\x1b[31m'+text.replaceAll('\x1b[39m','\x1b[31m')+'\x1b[39m');});
test('large escape sequences do not consume the call stack',()=>{const text='hello\x1b[39m'.repeat(20000),actual=c.red(text);assert.equal(actual,'\x1b[31m'+text.replaceAll('\x1b[39m','\x1b[31m')+'\x1b[39m');});
test('color factories are independent mutable objects',()=>{const a=pc.createColors(true),b=pc.createColors(true);a.red=()=>'';assert.notEqual(b.red('x'),'');assert.notEqual(a,b);});
