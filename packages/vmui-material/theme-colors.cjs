"use strict";
const system=require("vmui-system"),{deepmerge}=require("vmui-utils");
const roles=["primary","secondary","error","warning","info","success"];
function channel(color){
 try{const {values,type}=system.decomposeColor(color.startsWith("hsl")?system.hslToRgb(color):color);
  return values.slice(0,3).map(n=>type==="color"?Math.round(n*255):n).join(" ");
 }catch{return undefined}
}
function extendPalette(p,prefix){
 const dark=p.mode==="dark",ref=(path,value)=>"var(--"+(prefix?prefix+"-":"")+"palette-"+path+", "+value+")";
 const grey=n=>ref("grey-"+n,p.grey[n]);
 const shade=(color,amount)=>dark?system.darken(color,amount):system.lighten(color,amount);
 const derived={
  common:{background:dark?"#000":"#fff",onBackground:dark?"#fff":"#000"},
  Alert:{},AppBar:{defaultBg:grey(dark?900:100),...(dark?{darkBg:ref("background-paper",p.background.paper),darkColor:ref("text-primary",p.text.primary)}:{})},
  Avatar:{defaultBg:grey(dark?600:400)},Button:{inheritContainedBg:grey(dark?800:300),inheritContainedHoverBg:grey(dark?700:"A100")},
  Chip:{defaultBorder:grey(dark?700:400),defaultAvatarColor:grey(dark?300:700),defaultIconColor:grey(dark?300:700)},
  FilledInput:{bg:dark?"rgba(255, 255, 255, 0.09)":"rgba(0, 0, 0, 0.06)",hoverBg:dark?"rgba(255, 255, 255, 0.13)":"rgba(0, 0, 0, 0.09)",disabledBg:dark?"rgba(255, 255, 255, 0.12)":"rgba(0, 0, 0, 0.12)"},
  Input:{autofillWebkitBoxShadow:dark?"0 0 0 100px #266798 inset":"none"},
  LinearProgress:{},Slider:{},
  Skeleton:{bg:"rgba("+ref("text-primaryChannel",channel(p.text.primary))+" / "+(dark?0.13:0.11)+")"},
  SnackbarContent:{bg:system.emphasize(p.background.default,dark?.98:.8),color:p.getContrastText(system.emphasize(p.background.default,dark?.98:.8))},
  SpeedDialAction:{fabHoverBg:system.emphasize(p.background.paper,.15)},
  StepConnector:{border:grey(dark?600:400)},StepContent:{border:grey(dark?600:400)},
  Switch:{defaultColor:dark?grey(300):ref("common-white",p.common.white),defaultDisabledColor:grey(dark?600:100)},
  TableCell:{border:system.alpha(dark?system.darken(p.divider,.68):system.lighten(p.divider,.88),1)},
  Tooltip:{bg:system.alpha(p.grey[700],.92)}
 };
 // Dark surfaces lighten the paper on hover; tracks darken the role color.

 for(const role of roles){
  const color=p[role];
  derived.LinearProgress[role+"Bg"]=shade(color.main,dark?.5:.62);
  derived.Slider[role+"Track"]=derived.LinearProgress[role+"Bg"];
  derived.Switch[role+"DisabledColor"]=shade(color.main,dark?.55:.62);
  if(role==="primary"||role==="secondary")continue;
  derived.Alert[role+"Color"]=dark?system.lighten(color.light,.6):system.darken(color.light,.6);
  derived.Alert[role+"FilledBg"]=ref(role+"-"+(dark?"dark":"main"),color[dark?"dark":"main"]);
  derived.Alert[role+"FilledColor"]=p.getContrastText(color[dark?"dark":"main"]);
  derived.Alert[role+"StandardBg"]=dark?system.darken(color.light,.9):system.lighten(color.light,.9);
  derived.Alert[role+"IconColor"]=ref(role+"-main",color.main);
 }
 p=deepmerge(derived,p);
 for(const [part,keys] of [["common",["background","onBackground"]],["background",["default","paper"]],["text",["primary","secondary"]],["action",["active","selected"]],...roles.map(r=>[r,["main","light","dark","contrastText"]])]){
  for(const key of keys){const result=channel(p[part][key]);if(p[part][key+"Channel"]===undefined&&result!==undefined)p[part][key+"Channel"]=result}
 }
 if(p.dividerChannel===undefined)p.dividerChannel=channel(p.divider);
 return p;
}
module.exports={extendPalette};
