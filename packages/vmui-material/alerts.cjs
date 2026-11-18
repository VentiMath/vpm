'use strict';
const React = require('react');
const {styled, useThemeProps} = require('./theme.cjs');
const {Paper} = require('./surfaces.cjs');
const {Typography, SvgIcon} = require('./text.cjs');
const {IconButton} = require('./buttons.cjs');
const {lighten, darken} = require('vmui-system');
const h = React.createElement, empty = Object.freeze({});
const own = (object, key) => object && Object.hasOwn(object, key) ? object[key] : undefined;
const join = (...parts) => parts.filter(Boolean).join(' ');
const cap = value => value[0].toUpperCase() + value.slice(1);
const utility = slot => 'MuiAlert-' + slot;
const alertClasses = Object.freeze(Object.fromEntries(['root','filled','outlined','standard','colorSuccess','colorInfo','colorWarning','colorError','icon','message','action'].map(k => [k,utility(k)])));
// Default palette and spacing are public Material design values; no upstream
// component runtime or icon path is used here.
const fallback = {success:{light:'#4caf50',main:'#2e7d32',dark:'#1b5e20'},info:{light:'#03a9f4',main:'#0288d1',dark:'#01579b'},warning:{light:'#ff9800',main:'#ed6c02',dark:'#e65100'},error:{light:'#ef5350',main:'#d32f2f',dark:'#c62828'}};
const body2 = {fontFamily:'"Roboto", "Helvetica", "Arial", sans-serif',fontWeight:400,fontSize:'.875rem',lineHeight:1.43,letterSpacing:'.01071em'};
function appearance(theme, state) {
  const color = state.color || state.severity, dark = theme.palette.mode === 'dark';
  const raw = own(theme.palette, color), standard = own(fallback, color);
  if (!raw && !standard) return empty;
  const palette = theme.vars?.palette || theme.palette;
  const entry = own(palette, color) || raw || standard;
  const main = entry.main, light = entry.light || standard?.light || main;
  const tokens = palette.Alert;
  const text = theme.vars ? own(tokens,color+'Color') : (dark ? lighten(light,.6) : darken(light,.6));
  if (state.variant === 'filled') return {
    fontWeight:theme.typography.fontWeightMedium,
    backgroundColor:theme.vars ? own(tokens,color+'FilledBg') || 'transparent' : dark ? entry.dark || standard?.dark || main : main,
    color:theme.vars ? own(tokens,color+'FilledColor') : entry.contrastText || (standard ? '#fff' : theme.palette.getContrastText?.(main) || '#fff'),
  };
  const styles = {color:text, '.MuiAlert-icon':{color:theme.vars ? own(tokens,color+'IconColor') : main}};
  if (state.variant === 'outlined') styles.border = '1px solid ' + light;
  else if (state.variant === 'standard') styles.backgroundColor = theme.vars ? own(tokens,color+'StandardBg') || 'transparent' : dark ? darken(light,.9) : lighten(light,.9);
  return styles;
}
const Root = styled(Paper,{name:'MuiAlert',slot:'Root',overridesResolver:({ownerState:s},o)=>[o.root,o[s.variant],o[s.variant+cap(s.color||s.severity)],o['color'+cap(s.color||s.severity)]]})(({theme,ownerState})=>({
  ...(theme.typography.body2 || body2),backgroundColor:'transparent',display:'flex',padding:'6px 16px',...appearance(theme,ownerState),
}));
const Icon = styled('div',{name:'MuiAlert',slot:'Icon',overridesResolver:(_,o)=>o.icon})({marginRight:12,padding:'7px 0',display:'flex',fontSize:22,opacity:.9});
const Message = styled('div',{name:'MuiAlert',slot:'Message',overridesResolver:(_,o)=>o.message})({padding:'8px 0',minWidth:0,overflow:'auto'});
const Action = styled('div',{name:'MuiAlert',slot:'Action',overridesResolver:(_,o)=>o.action})({display:'flex',alignItems:'flex-start',padding:'4px 0 0 16px',marginLeft:'auto',marginRight:-8});
const Title = styled(Typography,{name:'MuiAlertTitle',slot:'Root',overridesResolver:(_,o)=>o.root})(({theme})=>({fontWeight:theme.typography.fontWeightMedium,marginTop:-2}));
// Original outline symbols keep decorative icons hidden from assistive tech.
const ring = h('circle',{cx:12,cy:12,r:9,fill:'none',stroke:'currentColor',strokeWidth:2});
const strokes = d => h('path',{d,fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinejoin:'round',strokeLinecap:'round'});
const shapes = {
  success:h(React.Fragment,null,ring,strokes('M7 12 L10.5 15.5 L17 8.5')),
  info:h(React.Fragment,null,ring,h('circle',{cx:12,cy:7.5,r:1}),strokes('M12 11 L12 17')),
  error:h(React.Fragment,null,ring,strokes('M12 6.5 L12 13'),h('circle',{cx:12,cy:17,r:1})),
  warning:h(React.Fragment,null,strokes('M12 3 L22 21 L2 21 Z M12 9 L12 14'),h('circle',{cx:12,cy:18,r:1})),
};
const defaultIcons = Object.freeze(Object.fromEntries(Object.entries(shapes).map(([name,shape])=>[name,h(SvgIcon,{fontSize:'inherit'},shape)])));
const CloseIcon = React.forwardRef(function CloseIcon(props,ref){return h(SvgIcon,{...props,ref},strokes('M6 6 L18 18 M18 6 L6 18'));});
const resolve = (value,state) => (typeof value === 'function' ? value(state) : value) || empty;
function useRefs(a,b) {
  return React.useMemo(()=>node=>{
    const refs=[a,b],clean=refs.map(r=>typeof r==='function'?r(node):r&&(r.current=node));
    return ()=>refs.forEach((r,i)=>{if(typeof clean[i]==='function')clean[i]();else if(typeof r==='function')r(null);else if(r)r.current=null;});
  },[a,b]);
}
const Alert = React.forwardRef(function Alert(input,forwardedRef) {
  const p=useThemeProps({props:input,name:'MuiAlert'});
  const {children,classes=empty,className,severity='success',color,variant='standard',role='alert',icon,iconMapping=empty,action,onClose,closeText='Close',slots=empty,slotProps=empty,...rest}=p;
  const state={...p,severity,color,variant}, root=resolve(slotProps.root,state), ref=useRefs(forwardedRef,root.ref);
  function part(name,Default,defaults,content) {
    const Component=slots[name] || Default, props=resolve(slotProps[name],state);
    const next={...defaults,...props,className:join(defaults?.className,own(classes,name),props.className)};
    if(typeof Component!=='string')next.ownerState=state;
    if(content!==undefined)next.children=content;
    return h(Component,next);
  }
  const RootSlot=slots.root || Root;
  const rootProps={role,elevation:0,...rest,...root,ref,className:join(utility('root'),own(classes,'root'),utility('color'+cap(color||severity)),own(classes,'color'+cap(color||severity)),utility(variant),own(classes,variant),className,root.className),style:{...rest.style,...root.style}};
  if(typeof RootSlot!=='string')rootProps.ownerState=state;
  const close = onClose && action == null ? part('closeButton',IconButton,{'aria-label':closeText,title:closeText,color:'inherit',size:'small',onClick:onClose},part('closeIcon',CloseIcon,{fontSize:'small'})) : action;
  return h(RootSlot,rootProps,
    icon!==false && part('icon',Icon,{className:utility('icon')},icon || own(iconMapping,severity) || own(defaultIcons,severity)),
    part('message',Message,{className:utility('message')},children),
    close!=null && part('action',Action,{className:utility('action')},close));
});
const AlertTitle = React.forwardRef(function AlertTitle(input,ref){
  const p=useThemeProps({props:input,name:'MuiAlertTitle'}),{classes=empty,className,...rest}=p;
  return h(Title,{gutterBottom:true,component:'div',...rest,ref,ownerState:p,className:join('MuiAlertTitle-root',classes.root,className)});
});
Alert.displayName='Alert';AlertTitle.displayName='AlertTitle';
module.exports={Alert,AlertTitle,alertClasses,getAlertUtilityClass:utility,alertTitleClasses:Object.freeze({root:'MuiAlertTitle-root'}),getAlertTitleUtilityClass:slot=>'MuiAlertTitle-'+slot};
