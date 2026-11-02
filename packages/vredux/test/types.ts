import {createStore,combineReducers,bindActionCreators,applyMiddleware,compose,isAction,type Reducer,type Middleware} from '../index.js';
type Action={type:'add';amount:number}|{type:'reset'};
const counter:Reducer<number,Action>=(state=0,action)=>action.type==='add'?state+action.amount:0;
const log:Middleware=()=>next=>action=>next(action);
const store=createStore(combineReducers({counter}));
createStore((s=0)=>s,compose(applyMiddleware(log)));
const value:number=store.getState().counter;
store.dispatch({type:'add',amount:2});
const bound=bindActionCreators({reset:():Action=>({type:'reset'})},store.dispatch);bound.reset();
// @ts-expect-error invalid action payload
store.dispatch({type:'add',amount:'2'});
// @ts-expect-error wrong state slice
const invalid:string=store.getState().counter;
declare const unknown:unknown;if(isAction(unknown)){const name:string=unknown.type;void name;}
void value;void invalid;
