'use strict';
const React = require('react');
const { styled, useThemeProps } = require('./theme.cjs');
const { ButtonBase } = require('./buttons.cjs');
const empty = Object.freeze({}), join = (...parts) => parts.filter(Boolean).join(' ');
const utility = slot => slot === 'focusVisible' ? 'Mui-focusVisible' : 'MuiCardActionArea-' + slot;
const cardActionAreaClasses = Object.freeze(Object.fromEntries(['root','focusVisible','focusHighlight'].map(slot => [slot,utility(slot)])));
const resolve = (props,state) => typeof props === 'function' ? props(state) : props || empty;
const Root = styled(ButtonBase,{name:'MuiCardActionArea',slot:'Root',overridesResolver:(_,o)=>o.root})(({theme})=>({
 display:'block',textAlign:'inherit',borderRadius:'inherit',width:'100%',
 '&:hover .MuiCardActionArea-focusHighlight':{opacity:(theme.vars?.palette||theme.palette).action?.hoverOpacity??.04,'@media (hover: none)':{opacity:0}},
 '&.Mui-focusVisible .MuiCardActionArea-focusHighlight':{opacity:(theme.vars?.palette||theme.palette).action?.focusOpacity??.12},
}));
const Highlight = styled('span',{name:'MuiCardActionArea',slot:'FocusHighlight',overridesResolver:(_,o)=>o.focusHighlight})(({theme})=>({
 overflow:'hidden',pointerEvents:'none',position:'absolute',top:0,right:0,bottom:0,left:0,borderRadius:'inherit',opacity:0,backgroundColor:'currentColor',
 transition:theme.transitions?.create?.('opacity',{duration:theme.transitions.duration?.short})||'opacity 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
}));
function useRefs(a,b){return React.useMemo(()=>node=>{const refs=[a,b],clean=refs.map(r=>typeof r==='function'?r(node):r&&(r.current=node));return()=>refs.forEach((r,i)=>{if(typeof clean[i]==='function')clean[i]();else if(typeof r==='function')r(null);else if(r)r.current=null;});},[a,b]);}
const CardActionArea = React.forwardRef(function CardActionArea(input,forwardedRef){
 const props=useThemeProps({props:input,name:'MuiCardActionArea'});
 const {children,classes=empty,className,focusVisibleClassName,slots=empty,slotProps=empty,...rest}=props;
 const root=resolve(slotProps.root,props),highlight=resolve(slotProps.focusHighlight,props),RootSlot=slots.root||Root,HighlightSlot=slots.focusHighlight||Highlight;
 const ref=useRefs(forwardedRef,root.ref);
 const custom=slot=>Object.hasOwn(classes,slot)&&classes[slot];
 const rootProps={focusRipple:true,...rest,...root,ref,
  className:join(utility('root'),custom('root'),className,root.className),
  focusVisibleClassName:join(utility('focusVisible'),custom('focusVisible'),focusVisibleClassName,root.focusVisibleClassName)};
 if(typeof RootSlot==='string'){delete rootProps.focusRipple;delete rootProps.focusVisibleClassName;delete rootProps.disableRipple;delete rootProps.component;}
 else rootProps.ownerState=props;
 const highlightProps={...highlight,className:join(utility('focusHighlight'),custom('focusHighlight'),highlight.className)};
 if(typeof HighlightSlot!=='string')highlightProps.ownerState=props;
 return React.createElement(RootSlot,rootProps,children,React.createElement(HighlightSlot,highlightProps));
});
CardActionArea.displayName='CardActionArea';
module.exports={CardActionArea,cardActionAreaClasses,getCardActionAreaUtilityClass:utility};
