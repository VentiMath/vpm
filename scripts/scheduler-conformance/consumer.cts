import S = require('vscheduler');
const t:S.Task=S.unstable_scheduleCallback(S.unstable_ImmediatePriority,didTimeout=>{const b:boolean=didTimeout;void b;});
S.unstable_cancelCallback(t);
const result:string=S.unstable_next(()=> 'contest');
void result;
