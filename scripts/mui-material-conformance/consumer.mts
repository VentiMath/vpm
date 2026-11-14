import * as React from "react";
import {
  Button,
  ButtonBase,
  IconButton,
  Fab,
  ButtonGroup,
  ToggleButton,
  ToggleButtonGroup,
  type ButtonProps,
  type IconButtonProps,
  type ButtonBaseActions,
} from "vmui-material";
import ButtonEntry, {
  buttonClasses,
  getButtonUtilityClass,
} from "vmui-material/Button";
import { createTheme, ThemeProvider } from "vmui-system";
const theme = createTheme({ spacing: 4 });
const Route = React.forwardRef<
  HTMLAnchorElement,
  { to: string; children?: React.ReactNode }
>((p, ref) => React.createElement("a", { ref, href: p.to }, p.children));
const action = React.createRef<ButtonBaseActions>();
const props: ButtonProps = {
  variant: "contained",
  size: "small",
  startIcon: "+",
  sx: { p: { xs: 1, md: 2 } },
  action,
};
const icon: IconButtonProps = {
  edge: "start",
  size: "small",
  loading: false,
  "aria-label": "Menu",
};
const controls = [
  Button(props),
  ButtonEntry({
    href: "/contest",
    target: "_blank",
    ref: React.createRef<HTMLAnchorElement>(),
  }),
  Button({ component: Route, to: "/resources", children: "Resources" }),
  ButtonBase({
    component: "div",
    onKeyDown: (event) => event.currentTarget.focus(),
  }),
  IconButton(icon),
  Fab({ variant: "extended", color: "secondary" }),
  ButtonGroup({
    orientation: "vertical",
    children: [Button({ children: "Next" })],
  }),
  ToggleButton({
    value: 3,
    selected: true,
    onChange: (_, value) => void value,
  }),
  ToggleButtonGroup({
    value: [1, 2],
    onChange: (_, days: number[]) => days.length,
  }),
  React.createElement(ThemeProvider, {
    theme,
    children: Button({ children: "Join" }),
  }),
];
buttonClasses.root;
getButtonUtilityClass("root");
action.current?.focusVisible();
// @ts-expect-error invalid size
Button({ size: "tiny" });
// @ts-expect-error missing required router destination
Button({ component: Route });
// @ts-expect-error href selects an anchor ref
Button({ href: "/contest", ref: React.createRef<HTMLButtonElement>() });
// @ts-expect-error loading must be a boolean or null
IconButton({ loading: "yes" });
void controls;

import {Typography,Link,SvgIcon,createSvgIcon,type TypographyProps,type LinkProps,type SvgIconProps} from 'vmui-material';
import TypographyEntry from 'vmui-material/Typography';
import LinkEntry from 'vmui-material/Link';
import SvgIconEntry,{createSvgIcon as iconFactory} from 'vmui-material/SvgIcon';
import factory from 'vmui-material/utils/createSvgIcon';
import {createSvgIcon as utilityFactory} from 'vmui-material/utils';
const textRef=React.createRef<HTMLSpanElement>();
const textOptions:TypographyProps={variant:'h2',noWrap:true,align:'center',fontWeight:700,sx:{m:2}};
Typography({...textOptions,ref:textRef,children:'Contest'});
Typography({component:'label',htmlFor:'answer',children:'Answer'});
Link({href:'/contest',underline:'hover',ref:React.createRef<HTMLAnchorElement>()});
Link({component:'button',type:'button',ref:React.createRef<HTMLButtonElement>()});
Link({component:Route,to:'/contest'});
SvgIcon({viewBox:'0 0 24 24',titleAccess:'Contest',ref:React.createRef<SVGSVGElement>(),fontSize:'small'});
const Icon=createSvgIcon(React.createElement('path',{d:'M0 0h24'}),'Contest');
Icon({titleAccess:'Contest',sx:{color:'primary.main'}});
const linkOptions:LinkProps={href:'/contest',underline:'always'};
const iconOptions:SvgIconProps={htmlColor:'#123456',inheritViewBox:true};
// @ts-expect-error typography defaults do not accept anchor-only properties
Typography({href:'/contest'});
// @ts-expect-error custom router requires its destination
Link({component:Route});
// @ts-expect-error invalid underline
Link({underline:'sometimes'});
// @ts-expect-error SVG root cannot take a button ref
SvgIcon({ref:React.createRef<HTMLButtonElement>()});
// @ts-expect-error custom button Link needs a button ref
Link({component:'button',ref:React.createRef<SVGSVGElement>()});
void [TypographyEntry,LinkEntry,SvgIconEntry,iconFactory,factory,utilityFactory,linkOptions,iconOptions];

ButtonBase({component: "div", nativeButton: false});
// @ts-expect-error nativeButton is boolean
ButtonBase({nativeButton: "yes"});

import {Box,GlobalStyles,useTheme,ThemeProvider as MaterialThemeProvider} from 'vmui-material';
import {styled,THEME_ID} from 'vmui-material/styles';
import BoxEntry from 'vmui-material/Box';
Box({component:'a',href:'/contest',ref:React.createRef<HTMLAnchorElement>(),sx:{p:2}});
Box({component:'svg',viewBox:'0 0 24 24',ref:React.createRef<SVGSVGElement>()});
const StyledBox=styled(Box)({padding:4});
MaterialThemeProvider({theme:{[THEME_ID]:theme},children:React.createElement(BoxEntry)});
GlobalStyles({styles:{body:{margin:0}}});
// @ts-expect-error anchor Box needs anchor ref
Box({component:'a',ref:React.createRef<HTMLButtonElement>()});
void [useTheme,StyledBox];

import Paper, {type PaperProps, paperClasses} from "vmui-material/Paper";
import Divider from "vmui-material/Divider";
import FontIcon from "vmui-material/Icon";
Paper({component:"article",ref:React.createRef<HTMLElement>(),elevation:3,variant:"outlined",sx:{p:2}});
Paper({component:"a",href:"/contest",ref:React.createRef<HTMLAnchorElement>()});
Divider({orientation:"vertical",flexItem:true,variant:"middle"});
FontIcon({component:"i",fontSize:"small",color:"primary","aria-hidden":false,"aria-label":"Palette"});
const paperOptions:PaperProps={square:true,elevation:0,classes:{rounded:paperClasses.rounded}};
void paperOptions;
// @ts-expect-error invalid orientation
Divider({orientation:"diagonal"});
// @ts-expect-error numeric elevation
Paper({elevation:"2"});
// @ts-expect-error incorrect anchor ref
Paper({component:"a",ref:React.createRef<HTMLDivElement>()});

import {FormControl,FormLabel,FormHelperText,useFormControl} from 'vmui-material';
import FormControlEntry from 'vmui-material/FormControl';
import FormLabelEntry from 'vmui-material/FormLabel';
import HelperEntry from 'vmui-material/FormHelperText';
import formContext from 'vmui-material/FormControl/FormControlContext';
import formHook from 'vmui-material/FormControl/useFormControl';
FormControl({component:'fieldset',required:true,margin:'dense',ref:React.createRef<HTMLFieldSetElement>()});
FormLabel({htmlFor:'contest',ref:React.createRef<HTMLLabelElement>(),required:false});
FormLabel({component:'legend',ref:React.createRef<HTMLLegendElement>()});
FormHelperText({id:'help',error:true,variant:'outlined',sx:{mt:1}});
// @ts-expect-error invalid margin
FormControl({margin:'huge'});
// @ts-expect-error legend ref cannot be an SVG ref
FormLabel({component:'legend',ref:React.createRef<SVGSVGElement>()});
// @ts-expect-error helper error is boolean
FormHelperText({error:'yes'});
void [FormControlEntry,FormLabelEntry,HelperEntry,useFormControl,formHook,formContext];
