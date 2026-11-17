"use strict";
const React = require('react');
const { styled, useThemeProps } = require('./theme.cjs');
const { Avatar } = require('./avatar-control.cjs');
const empty = Object.freeze({});
const join = (...values) => values.filter(Boolean).join(' ');
const utility = slot => 'MuiAvatarGroup-' + slot;
const avatarGroupClasses = Object.freeze({root:utility('root'),avatar:utility('avatar')});
const Root = styled('div', {
 name:'MuiAvatarGroup', slot:'Root',
 overridesResolver:(_,o)=>[o.root,{'& .MuiAvatarGroup-avatar':o.avatar}],
})(({theme})=>({
 display:'flex',flexDirection:'row-reverse',
 '& .MuiAvatar-root':{border:'2px solid '+(theme.vars?.palette||theme.palette).background.default,boxSizing:'content-box',marginLeft:'var(--AvatarGroup-spacing, -8px)','&:last-child':{marginLeft:0}},
}));
const AvatarGroup = React.forwardRef(function AvatarGroup(input,ref) {
 const props=useThemeProps({props:input,name:'MuiAvatarGroup'});
 const {children,classes=empty,className,component='div',max=5,total,spacing='medium',variant='circular',renderSurplus,slots=empty,slotProps=empty,style,...rest}=props;
 const avatars=React.Children.toArray(children).filter(React.isValidElement);
 const count=total||avatars.length,limit=Math.max(2,max);
 const visible=Math.min(avatars.length,count<=limit?count:limit-1),surplus=Math.max(0,count-visible);
 const state={...props,component,max,spacing,variant};
 const extra=(typeof slotProps.surplus==='function'?slotProps.surplus(state):slotProps.surplus)||empty;
 const Surplus=slots.surplus||Avatar,avatarClass=join(utility('avatar'),classes.avatar);
 const items=avatars.slice(0,visible).reverse().map(child=>React.cloneElement(child,{className:join(child.props.className,avatarClass),variant:child.props.variant||variant}));
 const overlap=spacing==='small'?16:spacing==='medium'?8:spacing;
 const surplusProps={variant,...extra,className:join(avatarClass,extra.className)};
 if(slots.surplus&&typeof Surplus!=='string')surplusProps.ownerState=state;
 return React.createElement(Root,{...rest,as:component,ref,ownerState:state,className:join(utility('root'),classes.root,className),style:{'--AvatarGroup-spacing':-overlap+'px',...style}},
  surplus>0?React.createElement(Surplus,surplusProps,renderSurplus?renderSurplus(surplus):'+'+surplus):null,items);
});
AvatarGroup.displayName='AvatarGroup';
module.exports={AvatarGroup,avatarGroupClasses,getAvatarGroupUtilityClass:utility};
