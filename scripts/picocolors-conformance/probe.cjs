'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const entry=process.env.VPICOCOLORS_ENTRY||path.resolve(__dirname,'../../packages/vpicocolors/index.cjs'),U=require('picocolors'),V=require(entry);let checks=0;
for(const enabled of [false,true]){const u=U.createColors(enabled),v=V.createColors(enabled);assert.deepEqual(Object.keys(v),Object.keys(u));for(const key of Object.keys(u))if(typeof u[key]==='function'){
 for(const value of ['',null,undefined,0,123,'error: bad stylesheet','line 1\nline 2','abc Ω💡']){assert.equal(v[key](value),u[key](value));checks++;}
 for(const inner of Object.keys(u))if(typeof u[inner]==='function'){assert.equal(v[key]('prefix '+v[inner]('inner')+' suffix'),u[key]('prefix '+u[inner]('inner')+' suffix'));checks++;}
}}
function load(file,env,argv,tty,platform){const m={exports:{}};const req=require('node:module').createRequire(file);vm.runInNewContext(fs.readFileSync(file,'utf8'),{module:m,exports:m.exports,require:req,process:{env,argv,stdout:{isTTY:tty},platform}});return m.exports.isColorSupported}
let detection=0;for(const no of [undefined,'','1'])for(const force of [undefined,'','0','1'])for(const ci of [undefined,'','1'])for(const term of [undefined,'dumb','xterm'])for(const argv of [[],['--color'],['--no-color'],['--color','--no-color']])for(const tty of [false,true])for(const platform of ['linux','win32']){const env={};if(no!==undefined)env.NO_COLOR=no;if(force!==undefined)env.FORCE_COLOR=force;if(ci!==undefined)env.CI=ci;if(term!==undefined)env.TERM=term;assert.equal(load(entry,env,argv,tty,platform),load(require.resolve('picocolors'),env,argv,tty,platform));detection++;}
const browser=require(path.dirname(entry)+'/browser.cjs');for(const enabled of [false,true]){assert.equal(browser.createColors(enabled).isColorSupported,false);assert.equal(browser.createColors(enabled).red('x'),'x')}
console.log(checks+' formatter/nesting comparisons and '+detection+' environment combinations pass; browser entry stays inert');
