import retry, {operation, RetryOperation, type Options} from 'vretry';
import Operation = require('vretry/lib/retry_operation');
const options: Options = {retries:3, maxRetryTime:1000, unref:true};
const op: RetryOperation = operation(options);
op.attempt(attempt=>{const n:number=attempt;op.retry(new Error(String(n)));});
const errors:unknown[] = op.errors(); const error:unknown = op.mainError();
new Operation([1,2] as const).stop(); retry.timeouts([1,2] as const);
retry.wrap({method(cb:()=>void){cb();}},options,['method']);
// @ts-expect-error retry counts are numeric
operation({retries:'3'});
// @ts-expect-error attempt callbacks require a function
op.attempt(1);
void [errors,error];
