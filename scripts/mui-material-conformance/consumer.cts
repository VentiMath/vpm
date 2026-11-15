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

import {InputBase,type InputBaseProps} from 'vmui-material';
import InputBaseEntry from 'vmui-material/InputBase';
InputBase({ref:React.createRef<HTMLDivElement>(),inputRef:React.createRef<HTMLInputElement>(),type:'number',inputProps:{min:0,max:100},onChange:e=>{const value:string=e.target.value;void value;}});
InputBase({multiline:true,minRows:2,maxRows:4,slotProps:{input:{'aria-label':'Travel notes',maxLength:100}}});
const inputOptions:InputBaseProps={value:0,required:true,error:false,slots:{root:'section'},renderSuffix:s=>s.focused?'Focused':null};
// @ts-expect-error root ref points to a div, not an SVG
InputBase({ref:React.createRef<SVGSVGElement>()});
// @ts-expect-error numeric or string row limit
InputBase({maxRows:{}});
// @ts-expect-error boolean disabled
InputBase({disabled:'no'});
void [InputBaseEntry,inputOptions];

import InputLabel=require('vmui-material/InputLabel');
import InputAdornment=require('vmui-material/InputAdornment');
InputLabel.default({htmlFor:'fee',shrink:true});
InputAdornment.default({position:'start',children:'$'});

import TextField=require('vmui-material/TextField');
TextField.default({label:'Contest',variant:'standard',InputProps:{disableUnderline:true}});

import MenuItem=require('vmui-material/MenuItem');
import Menu=require('vmui-material/Menu');
import Popover=require('vmui-material/Popover');
MenuItem.default({component:'a',href:'#contest',selected:true});
Menu.default({open:false});Popover.default({open:false,anchorPosition:{top:10,left:20}});

import {Select,type SelectChangeEvent,type SelectInputHandle} from 'vmui-material';
const selectHandle=React.createRef<SelectInputHandle<number>>();
Select<number>({value:0,inputRef:selectHandle,onChange:(event,child)=>{const v:number|string=event.target.value;void v;void child;},MenuProps:{disableScrollLock:true}});
Select<string[]>({multiple:true,value:['amc'],renderValue:value=>value.join(', '),SelectDisplayProps:{'aria-label':'Contests'}});
// @ts-expect-error array values must match the declared Select value type
Select<number>({value:['amc']});
// @ts-expect-error invalid variant
Select({variant:'ghost'});
// @ts-expect-error open is boolean
Select({open:'yes'});

import {Checkbox,FormControlLabel} from 'vmui-material';
Checkbox({checked:true,indeterminate:true,slotProps:{input:{ref:React.createRef<HTMLInputElement>(),'aria-label':'Select all'}},onChange:(event,checked)=>{const b:boolean=checked;const input:HTMLInputElement=event.target;void b;void input;}});
FormControlLabel({control:React.createElement(Checkbox),label:'Confirm',labelPlacement:'start',ref:React.createRef<HTMLLabelElement>(),slotProps:{typography:{variant:'body2'}}});
// @ts-expect-error checked is boolean
Checkbox({checked:'yes'});
// @ts-expect-error label placement is constrained
FormControlLabel({control:React.createElement(Checkbox),label:'A',labelPlacement:'left'});
// @ts-expect-error a control element is required
FormControlLabel({label:'A'});

import {Radio,RadioGroup,FormGroup,useRadioGroup,type RadioGroupActions} from 'vmui-material';
Radio({value:'early',size:'small',inputRef:React.createRef<HTMLInputElement>(),onChange:(e,v)=>{const checked:boolean=v;void checked;void e.target.checked;}});
RadioGroup({name:'flight',defaultValue:'early',row:true,actions:React.createRef<RadioGroupActions>(),onChange:(e,value)=>{const v:string=value;void v;void e.target.value;}});
FormGroup({row:true,sx:{gap:2}});
const radioState=useRadioGroup();if(radioState){const name:string=radioState.name;void name;}
// @ts-expect-error checked is boolean
Radio({checked:'true'});
// @ts-expect-error row is boolean
RadioGroup({row:'yes'});
// @ts-expect-error Radio has no mixed state
Radio({indeterminate:true});

import Switch, {switchClasses,getSwitchUtilityClass} from 'vmui-material/Switch';
Switch({checked:true,size:'small',color:'secondary',inputRef:React.createRef<HTMLInputElement>(),onChange:(e,checked)=>{const b:boolean=checked;void b;void e.target.checked;},slotProps:{input:s=>({'aria-label':s.checked?'On':'Off'}),track:{ref:React.createRef<HTMLSpanElement>()}}});
void switchClasses.thumb;void getSwitchUtilityClass('track');
// @ts-expect-error Switch has no mixed state
Switch({indeterminate:true});
// @ts-expect-error Switch size is small or medium
Switch({size:'large'});

import Chip from 'vmui-material/Chip';
Chip({label:'Confirmed',color:'success',variant:'outlined'});
