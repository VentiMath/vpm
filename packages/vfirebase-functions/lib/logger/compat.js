'use strict';
const {format}=require('node:util');
const {UNPATCHED_CONSOLE,CONSOLE_SEVERITY}=require('./common.js');
for(const [method,severity] of Object.entries({debug:'DEBUG',info:'INFO',log:'INFO',warn:'WARNING',error:'ERROR'})){
  console[method]=(...args)=>UNPATCHED_CONSOLE[CONSOLE_SEVERITY[severity]](JSON.stringify({severity,message:format(...args)}));
}
