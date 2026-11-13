import * as React from 'react';
import {motion,useAnimation,MotionConfig,type Target} from 'vmotion/react';
import {IconButton} from 'vmui-material';
const target:Target={opacity:1,x:0,transition:{delay:.2}};
React.createElement(motion.div,{initial:{opacity:0},animate:target,ref:React.createRef<HTMLDivElement>()});
React.createElement(motion.button,{type:'button',variants:{hidden:{opacity:0},show:target},onClick:event=>event.currentTarget.focus()});
IconButton({component:motion.button,variants:{hidden:{y:20}},ref:React.createRef<HTMLButtonElement>()});
const Link=React.forwardRef<HTMLAnchorElement,{to:string}>((p,ref)=>React.createElement('a',{href:p.to,ref}));
React.createElement(motion.create(Link),{to:'/contest',animate:target});
function Bell(){const controls=useAnimation();void controls.start({rotate:[0,20,-20,0],transition:{repeat:5}});return React.createElement(motion.div,{animate:controls});}
React.createElement(MotionConfig,{reducedMotion:'user'},React.createElement(Bell));
// @ts-expect-error wrong ref for div
React.createElement(motion.div,{ref:React.createRef<HTMLButtonElement>()});
// @ts-expect-error wrong animation prop
React.createElement(motion.div,{animate:4});
// @ts-expect-error unsupported gestures
React.createElement(motion.div,{whileHover:{scale:2}});
// @ts-expect-error custom component still requires to
React.createElement(motion.create(Link),{animate:target});
