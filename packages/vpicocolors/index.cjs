'use strict';
const {createColors:make}=require('./core.cjs');
const proc=typeof process==='object'?process:undefined,env=proc?.env||{},argv=proc?.argv||[];
const supported=!(env.NO_COLOR||argv.includes('--no-color'))&&!!(env.FORCE_COLOR||argv.includes('--color')||proc?.platform==='win32'||(proc?.stdout?.isTTY&&env.TERM!=='dumb')||env.CI);
module.exports=make(supported);
module.exports.createColors=(enabled=supported)=>make(enabled);
