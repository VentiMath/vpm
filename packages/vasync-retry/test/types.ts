import retry from 'vasync-retry';
import retryCjs = require('vasync-retry');
const value:Promise<number>=retry(async(bail,attempt)=>{if(attempt>2)bail(Error('stop'));return attempt;},{retries:2,onRetry(error,attempt){const e:unknown=error;const n:number=attempt;void [e,n];}});
const sync:Promise<string>=retryCjs(()=> 'ok', {randomize:false});
// @ts-expect-error task must be callable
retry(1);
// @ts-expect-error onRetry must be callable
retry(()=>1,{onRetry:true});
void [value,sync];
