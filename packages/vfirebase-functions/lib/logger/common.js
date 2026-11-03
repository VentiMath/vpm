'use strict';
const CONSOLE_SEVERITY=Object.fromEntries([
  ['DEBUG','debug'],['INFO','info'],['NOTICE','info'],['WARNING','warn'],
  ...['ERROR','CRITICAL','ALERT','EMERGENCY'].map(level=>[level,'error']),
]);
const UNPATCHED_CONSOLE=Object.fromEntries(['debug','info','log','warn','error'].map(name=>[name,console[name]]));
module.exports={CONSOLE_SEVERITY,UNPATCHED_CONSOLE};
