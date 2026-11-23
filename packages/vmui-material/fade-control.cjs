"use strict";
const React=require("react"),{Fade:Transition}=require("./modal-primitives.cjs"),{useTheme}=require("./theme.cjs");
const Fade=React.forwardRef(function Fade(props,ref){
 const theme=useTheme();
 return React.createElement(Transition,{timeout:{enter:theme.transitions.duration.enteringScreen,exit:theme.transitions.duration.leavingScreen},...props,ref});
});
Fade.muiSupportAuto=true;
module.exports={Fade};
