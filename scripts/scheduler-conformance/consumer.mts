import S, {unstable_scheduleCallback as schedule, unstable_NormalPriority as normal, unstable_cancelCallback as cancel, unstable_wrapCallback as wrap, unstable_runWithPriority as run, type Callback, type Task} from 'vscheduler';
let count=0;
const callback: Callback = didTimeout => {if(didTimeout) count++;return count<3?callback:undefined;};
const task:Task=schedule(normal,callback,{delay:10});cancel(task);cancel(null);
const answer:number=run(S.unstable_UserBlockingPriority,()=>42);
const f=wrap(function(this:{x:number},v:string){return this.x+v.length;});
const result:number=f.call({x:2},'abc');
// @ts-expect-error task handles cannot be fabricated
cancel({id:1});
// @ts-expect-error priorities are the public enum
schedule(9,callback);
// @ts-expect-error scheduled callbacks return continuations, not promises
schedule(normal,async()=>{});
// @ts-expect-error wrappers preserve parameter types
f.call({x:2},8);
void [result,answer];
