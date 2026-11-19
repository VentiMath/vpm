import EventEmitter, {EventEmitter as Named} from 'veventemitter3';
const context={source:'docs'};
const events=new EventEmitter<{change:[id:string];position:(y:number)=>void},typeof context>();
events.on('change',id=>id.toUpperCase(),context).once('position',y=>y.toFixed());
const emitted:boolean=events.emit('change','contests');
const same:typeof EventEmitter=Named;void same;void emitted;
// @ts-expect-error wrong event argument
events.emit('position','wrong');
// @ts-expect-error unknown event
events.on('missing',()=>{});
// @ts-expect-error context shape
events.on('change',()=>{},{other:1});
const eventArgs:EventEmitter.EventArgs<{read:[string]},'read'>=['id'];void eventArgs;
