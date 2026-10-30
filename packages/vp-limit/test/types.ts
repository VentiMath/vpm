import pLimit, {limitFunction, type Options, type LimitFunction} from 'vp-limit';
import pLimitCjs = require('vp-limit');
const options: Options = {concurrency:2, rejectOnClear:true};
const limit: LimitFunction = pLimit(options);
const value: Promise<number> = limit((a: number, b: number) => a + b, 1, 2);
const mapped: Promise<string[]> = limit.map(new Set([1]), async (v,i)=>`${v+i}`);
const arrayLike: Promise<number[]> = limit.map({0:1,length:1}, (v)=>v);
const limited = limitFunction((v:number)=>v+1, options);
const result: Promise<number> = limited(1); limited.clearQueue();
pLimitCjs(1).concurrency = 2;
// @ts-expect-error argument type is checked
limited('bad');
// @ts-expect-error task arguments are required
limit((v: number)=>v);
// @ts-expect-error activeCount is read-only
limit.activeCount = 0;
void [value,mapped,arrayLike,result];
