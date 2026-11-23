import type * as React from 'react';
import type {OverridableComponent,OverrideProps} from 'vmui-material/OverridableComponent';
import type {TransitionProps,EnterHandler,ExitHandler} from 'vmui-material/transitions';
type Map = {props:{value:number};defaultComponent:'button'};
declare const Control:OverridableComponent<Map>;
Control({value:1,type:'button'});
Control({component:'a',value:1,href:'/contest',ref:(_node:HTMLAnchorElement|null)=>{}});
// @ts-expect-error default button cannot take an anchor URL
Control({value:1,href:'/contest'});
// @ts-expect-error own required props are not lost during root substitution
Control({component:'a',href:'/contest'});
const explicit:OverrideProps<Map,'a'>={value:1,href:'/contest'};
const enter:EnterHandler=(node,appearing)=>{node.focus();const yes:boolean=appearing;};
const exit:ExitHandler=node=>node.focus();
const transition:TransitionProps={in:true,timeout:{enter:120,exit:90},easing:{enter:'ease'},onEnter:enter,onExited:exit,addEndListener:(node,done)=>{node.addEventListener('transitionend',done,{once:true})}};
// @ts-expect-error timeout is duration data, not a string coercion
const bad:TransitionProps={timeout:'100'};
