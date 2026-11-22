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
import type { GlobalStylesProps as MaterialGlobalStylesProps } from "vmui-material/GlobalStyles";
const pageRules: MaterialGlobalStylesProps = {styles: theme => ({body:{margin:theme.spacing(1)}})};
GlobalStyles(pageRules);
// @ts-expect-error The Material wrapper supplies the theme namespace internally.
GlobalStyles({styles:{}, themeId:"custom"});
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

import Input, {inputClasses} from 'vmui-material/Input';
import OutlinedInput, {outlinedInputClasses} from 'vmui-material/OutlinedInput';
React.createElement(Input,{disableUnderline:true,inputRef:React.createRef<HTMLInputElement>(),type:'number',inputProps:{min:0,max:100},classes:{underline:inputClasses.underline}});
React.createElement(OutlinedInput,{label:'Contest',notched:false,multiline:true,minRows:2,slotProps:{notchedOutline:state=>({'aria-hidden':true,'aria-label':state.required?'Required':'Optional',ref:React.createRef<HTMLFieldSetElement>()})},classes:{notchedOutline:outlinedInputClasses.notchedOutline}});
// @ts-expect-error outlined variants have no underline switch
React.createElement(OutlinedInput,{disableUnderline:true});
// @ts-expect-error notched is a boolean
React.createElement(OutlinedInput,{notched:'yes'});

import InputLabel,{inputLabelClasses} from 'vmui-material/InputLabel';
import InputAdornment from 'vmui-material/InputAdornment';
InputLabel({htmlFor:'fee',shrink:true,size:'small',classes:{shrink:inputLabelClasses.shrink},ref:React.createRef<HTMLLabelElement>()});
InputLabel({component:'span',ref:React.createRef<HTMLSpanElement>(),disableAnimation:true});
InputAdornment({position:'end',disablePointerEvents:true,children:'kg',ref:React.createRef<HTMLDivElement>()});
InputAdornment({component:'aside',position:'start',disableTypography:true});
// @ts-expect-error position is required
InputAdornment({children:'$'});
// @ts-expect-error only start or end positions
InputAdornment({position:'left'});
// @ts-expect-error label shrink is boolean
InputLabel({shrink:'yes'});

import TextField,{type TextFieldProps} from 'vmui-material/TextField';
TextField({id:'contest',label:'Contest',required:true,helperText:'Required',inputRef:React.createRef<HTMLInputElement>(),onChange:e=>{const value:string=e.target.value;void value;},slotProps:{htmlInput:{maxLength:100},inputLabel:s=>({shrink:s.error})}});
TextField({variant:'standard',slotProps:{input:{disableUnderline:true,inputRef:React.createRef<HTMLInputElement>()}}});
const noteField:TextFieldProps={multiline:true,minRows:2,maxRows:5};
TextField({type:'number',slotProps:{htmlInput:{min:0,max:100,step:5}}});
// @ts-expect-error outlined fields do not expose the standard underline switch
TextField<'outlined'>({variant:'outlined',slotProps:{input:{disableUnderline:true}}});
// @ts-expect-error invalid variant
TextField({variant:'ghost'});
// @ts-expect-error numeric/string rows only
TextField({minRows:{}});
void noteField;

import { MenuItem, MenuList, List, ListSubheader, ListItemText, ListItemIcon, Menu, Popover } from 'vmui-material';
React.createElement(MenuItem,{component:'a',href:'#contest',selected:true,value:'weekly',ref:React.createRef<HTMLAnchorElement>()},'Weekly');
React.createElement(MenuList,{autoFocusItem:true,disableListWrap:true},React.createElement(ListSubheader,{},'Contests'));
React.createElement(List,{dense:true},React.createElement(ListItemIcon,{},'*'),React.createElement(ListItemText,{primary:'Contest',secondary:'Details',slotProps:{primary:{noWrap:true}}}));
React.createElement(Menu,{open:true,anchorEl:()=>document.body,onClose:(_event,reason)=>{const valid:'escapeKeyDown'|'backdropClick'|'tabKeyDown'=reason;void valid;},slotProps:{paper:{style:{width:220}},list:{dense:true}}});
React.createElement(Popover,{open:false,anchorReference:'anchorPosition',anchorPosition:{left:10,top:20},action:React.createRef<{updatePosition():void}>()});
// @ts-expect-error unknown menu variant
React.createElement(MenuList,{variant:'invalid'});
// @ts-expect-error custom transitions await an independently verified implementation
React.createElement(Popover,{open:true,slots:{transition:'span'}});

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

import Chip, { chipClasses, type ChipProps } from 'vmui-material/Chip';
import chipUtility from 'vmui-material/chipClasses';
const chipProps:ChipProps={label:'Roommate',avatar:React.createElement('span'),onDelete:e=>e.stopPropagation(),draggable:true,onDragStart:e=>e.dataTransfer.setData('text/plain','student'),slotProps:{label:state=>({className:state.size})}};
Chip(chipProps);Chip({component:'a',href:'/contest',ref:React.createRef<HTMLAnchorElement>(),label:'Contest',clickable:true});
chipUtility.root satisfies string;chipClasses.label satisfies string;
// @ts-expect-error Chip has small and medium sizes
Chip({size:'large'});
// @ts-expect-error ref must match the root
Chip({component:'a',ref:React.createRef<HTMLButtonElement>()});

import Avatar, { type AvatarProps } from 'vmui-material/Avatar';
import avatarUtility from 'vmui-material/avatarClasses';
const avatarProps:AvatarProps={alt:'Student',src:'/student.png',variant:'rounded',slotProps:{img:{ref:React.createRef<HTMLImageElement>(),referrerPolicy:'no-referrer',onError:e=>e.currentTarget.removeAttribute('src')}}};
Avatar(avatarProps);Avatar({component:'a',href:'/profile',ref:React.createRef<HTMLAnchorElement>(),children:'A'});avatarUtility.root satisfies string;
// @ts-expect-error unsupported variant
Avatar({variant:'triangle'});
// @ts-expect-error image ref must be an image
Avatar({slotProps:{img:{ref:React.createRef<HTMLButtonElement>()}}});

import CircularProgress, {type CircularProgressProps} from 'vmui-material/CircularProgress';
import progressClasses from 'vmui-material/circularProgressClasses';
const progressProps:CircularProgressProps={variant:'determinate',min:10,max:30,value:20,enableTrackSlot:true,size:'2rem',ref:React.createRef<HTMLSpanElement>(),'aria-label':'Results loaded'};
CircularProgress(progressProps);progressClasses.track satisfies string;
// @ts-expect-error finite numeric input required
CircularProgress({value:'50'});
// @ts-expect-error unknown variant
CircularProgress({variant:'buffer'});

import Skeleton, {type SkeletonProps} from 'vmui-material/Skeleton';
import skeletonUtilities from 'vmui-material/skeletonClasses';
const skeletonProps:SkeletonProps={variant:'rounded',animation:'wave',width:'70%',height:120,children:0,sx:{mb:2},ref:React.createRef<HTMLSpanElement>()};
Skeleton(skeletonProps);Skeleton({component:'div',ref:React.createRef<HTMLDivElement>(),role:'presentation'});skeletonUtilities.rounded satisfies string;
// @ts-expect-error animation is pulse, wave or false
Skeleton({animation:'spin'});
// @ts-expect-error dimensions are numeric or CSS strings
Skeleton({width:new Date()});

import Container, {type ContainerProps} from 'vmui-material/Container';
import containerUtilities from 'vmui-material/containerClasses';
const containerProps:ContainerProps={maxWidth:'sm',fixed:true,disableGutters:false,sx:{py:4},ref:React.createRef<HTMLDivElement>()};
Container(containerProps);Container({component:'a',href:'/results',ref:React.createRef<HTMLAnchorElement>()});containerUtilities.maxWidthSm satisfies string;
// @ts-expect-error maxWidth is a breakpoint or false
Container({maxWidth:true});
// @ts-expect-error native div has no href
Container({href:'/results'});

import Card,{type CardProps} from 'vmui-material/Card';
import CardContent,{type CardContentProps} from 'vmui-material/CardContent';
import cardUtilities from 'vmui-material/cardClasses';
import cardContentUtilities from 'vmui-material/cardContentClasses';
const cardProps:CardProps={raised:true,elevation:2,variant:'outlined',square:false,sx:{p:3},ref:React.createRef<HTMLDivElement>()};
const contentProps:CardContentProps={sx:{p:0,'&:last-child':{pb:0}},ref:React.createRef<HTMLDivElement>()};
Card(cardProps);CardContent(contentProps);Card({component:'a',href:'/exam',ref:React.createRef<HTMLAnchorElement>()});CardContent({component:'label',htmlFor:'answer'});
cardUtilities.root satisfies string;cardContentUtilities.root satisfies string;
// @ts-expect-error raised is boolean
Card({raised:'yes'});
// @ts-expect-error Card elevation is numeric
Card({elevation:'2'});
// @ts-expect-error Content does not expose Paper elevation
CardContent({elevation:2});
// @ts-expect-error div does not accept href
CardContent({href:'/exam'});

import CardActionArea,{type CardActionAreaProps} from 'vmui-material/CardActionArea';
const area:CardActionAreaProps={disabled:false,action:React.createRef<ButtonBaseActions>(),slotProps:{focusHighlight:{id:'highlight'}}};
CardActionArea(area);CardActionArea({component:'a',href:'/exam',ref:React.createRef<HTMLAnchorElement>()});
// @ts-expect-error disabled must be boolean
CardActionArea({disabled:'yes'});

import AvatarGroup from 'vmui-material/AvatarGroup';
import {avatarGroupClasses} from 'vmui-material';
React.createElement(AvatarGroup,{max:4,total:12,spacing:'small',renderSurplus:n=>String(n),ref:React.createRef<HTMLDivElement>(),slotProps:{surplus:state=>({title:String(state.max)})}});
AvatarGroup({component:'section','aria-label':'Members'});
// @ts-expect-error spacing is a keyword or number
React.createElement(AvatarGroup,{spacing:'wide'});
void avatarGroupClasses.avatar;

import Tooltip,{type TooltipProps,tooltipClasses} from 'vmui-material/Tooltip';
const hint:TooltipProps={title:'Copied!',children:React.createElement('button'),open:true,arrow:true,slotProps:{popper:{placement:'top'},tooltip:s=>({title:s.side})},ref:React.createRef<HTMLButtonElement>()};
React.createElement(Tooltip,hint);void tooltipClasses.arrow;
// @ts-expect-error placement must be a supported side/alignment
React.createElement(Tooltip,{...hint,placement:'middle'});
// @ts-expect-error title is required
React.createElement(Tooltip,{children:React.createElement('span')});

import Collapse, {type CollapseProps, getCollapseUtilityClass} from "vmui-material/Collapse";
import collapseClasses from "vmui-material/collapseClasses";
const collapseProps:CollapseProps={in:true,timeout:{enter:200,exit:100},onEntering:(node,appear)=>{node.focus();void appear},slotProps:{wrapper:s=>({title:s.state})},sx:{m:1}};
React.createElement(Collapse,{...collapseProps,ref:React.createRef<HTMLDivElement>()},"Exam preview");
void getCollapseUtilityClass("root");void collapseClasses.wrapper;
// @ts-expect-error only horizontal and vertical orientations
const invalidCollapse:CollapseProps={orientation:"diagonal"};
// @ts-expect-error automatic timing uses the documented auto value
const invalidCollapseTiming:CollapseProps={timeout:"slow"};

import DialogTitle, {type DialogTitleProps} from "vmui-material/DialogTitle";
import DialogContent, {type DialogContentProps} from "vmui-material/DialogContent";
import DialogActions, {type DialogActionsProps} from "vmui-material/DialogActions";
import dialogContentClasses from "vmui-material/dialogContentClasses";
const titleProps:DialogTitleProps={id:"title",variant:"h6",sx:{fontWeight:700}};
React.createElement(DialogTitle<"h3">,{...titleProps,component:"h3",ref:React.createRef<HTMLHeadingElement>()},"Edit reminder");
React.createElement(DialogContent,{dividers:true,ref:React.createRef<HTMLDivElement>(),sx:{pt:"1rem !important"}},"Fields");
React.createElement(DialogActions,{disableSpacing:true,sx:{flexWrap:"wrap"}},"Save");
void dialogContentClasses.dividers;
// @ts-expect-error divider state is boolean
const invalidDialogContent:DialogContentProps={dividers:"yes"};
// @ts-expect-error spacing state is boolean
const invalidDialogActions:DialogActionsProps={disableSpacing:1};

import Dialog, {type DialogProps} from "vmui-material/Dialog";
import dialogClasses from "vmui-material/dialogClasses";
const dialogProps:DialogProps={open:true,fullWidth:true,maxWidth:"sm",onClose:(_event,reason)=>{const valid:"backdropClick"|"escapeKeyDown"=reason;void valid},slotProps:{paper:{component:"section",ref:React.createRef<HTMLElement>()},backdrop:{invisible:true},transition:{onExited:node=>node.focus()}}};
React.createElement(Dialog,{...dialogProps,ref:React.createRef<HTMLDivElement>()},"Form");
void dialogClasses.paperFullScreen;
// @ts-expect-error a controlled dialog requires open
const missingDialogOpen:DialogProps={};
// @ts-expect-error scroll is a fixed documented option
const invalidDialogScroll:DialogProps={open:true,scroll:"viewport"};

import Slide, { type SlideProps } from 'vmui-material/Slide';
const slideOptions:SlideProps={children:React.createElement('div'),in:true,direction:'left',container:node=>node.ownerDocument.body,ref:React.createRef<HTMLElement>(),timeout:{enter:100,exit:50},onEnter:(node,appearing)=>{node.focus();void appearing;},disablePrefersReducedMotion:true};
React.createElement(Slide,slideOptions);
// @ts-expect-error directions are physical edges
React.createElement(Slide,{children:React.createElement('div'),direction:'diagonal'});
// @ts-expect-error a child element is required
React.createElement(Slide,{in:true});

import DialogContentText, {type DialogContentTextProps} from 'vmui-material/DialogContentText';
const descriptionProps:DialogContentTextProps={id:'description',color:'text.secondary',sx:{mb:2},ref:React.createRef<HTMLParagraphElement>()};
React.createElement(DialogContentText,descriptionProps,'Leave this page?');
React.createElement(DialogContentText<'a'>,{component:'a',href:'/help',ref:React.createRef<HTMLAnchorElement>()},'Help');
// @ts-expect-error paragraph roots do not accept href
const invalidDescription:DialogContentTextProps={href:'/help'};

import Drawer, {type DrawerProps} from 'vmui-material/Drawer';
import drawerClasses from 'vmui-material/drawerClasses';
const sidebar:DrawerProps={variant:'permanent',anchor:'left',open:false,classes:{paper:'FusePageCarded-sidebar'},sx:{'& .MuiPaper-root':{width:'240px'}},ref:React.createRef<HTMLDivElement>()};
React.createElement(Drawer,sidebar,'Practice');
React.createElement(Drawer,{open:true,ModalProps:{keepMounted:true,disableRestoreFocus:true},slotProps:{paper:s=>({component:'section','aria-label':s.anchor}),transition:{direction:'right',onExited:node=>node.focus()},root:{disableScrollLock:true}},onClose:(_event,reason)=>{const closed:'escapeKeyDown'|'backdropClick'=reason;void closed;}});
void drawerClasses.docked;
// @ts-expect-error drawer variants have a fixed set
const wrongDrawerVariant:DrawerProps={variant:'floating'};
// @ts-expect-error anchor is a physical edge
const wrongDrawerAnchor:DrawerProps={anchor:'middle'};

import SwipeableDrawer,{type SwipeableDrawerProps} from 'vmui-material/SwipeableDrawer';
const navigation:SwipeableDrawerProps={open:true,anchor:'right',disableSwipeToOpen:true,onOpen:()=>{},onClose:()=>{},ModalProps:{keepMounted:true},ref:React.createRef<HTMLDivElement>(),classes:{paper:'FuseSidePanel-paper'}};
React.createElement(SwipeableDrawer,navigation,'Navigation');
React.createElement(SwipeableDrawer,{onOpen:e=>void e.type,onClose:e=>void e.type,allowSwipeInChildren:(e,area,paper)=>paper.contains(e.target as Node)&&area.offsetWidth>0,slotProps:{swipeArea:s=>({title:s.anchor})},hysteresis:.6});
// @ts-expect-error controlled requests require both callbacks
const missingSwipeCallbacks:SwipeableDrawerProps={onOpen:()=>{}};
// @ts-expect-error hysteresis is numeric
const wrongSwipeThreshold:SwipeableDrawerProps={...navigation,hysteresis:'half'};

import {Table,TableBody,TableCell,TableContainer,TableFooter,TableHead,TableRow} from 'vmui-material';
import TableEntry from 'vmui-material/Table';
React.createElement(Table,{ref:React.createRef<HTMLTableElement>(),size:'small',stickyHeader:true},React.createElement(TableHead,null,React.createElement(TableRow,{selected:true},React.createElement(TableCell,{sortDirection:'asc',scope:'col',colSpan:2},'Score'))));
React.createElement(TableContainer,{component:Paper,elevation:0,sx:{maxHeight:'70vh'}},React.createElement(TableEntry,null,React.createElement(TableBody),React.createElement(TableFooter)));
// @ts-expect-error sorting uses the documented ascending/descending tokens
React.createElement(TableCell,{sortDirection:'sideways'});
// @ts-expect-error sticky headers belong to Table, not TableRow
const invalidTableRow:import('vmui-material').TableRowProps={stickyHeader:true};

import {Autocomplete,createFilterOptions,type AutocompleteProps} from 'vmui-material';
import AutocompleteEntry from 'vmui-material/Autocomplete';
const schoolOptions=[{id:1,label:'School'}];
const schoolControl:AutocompleteProps<typeof schoolOptions[number]>= {options:schoolOptions,value:schoolOptions[0],isOptionEqualToValue:(a,b)=>a.id===b.id,onChange:(e,v,reason)=>{const id:number|undefined=v?.id;},renderInput:params=>React.createElement(TextField,{...params,label:'School'})};
React.createElement(Autocomplete<typeof schoolOptions[number]>,schoolControl);
AutocompleteEntry({options:['School'],multiple:true,freeSolo:true,value:['New school'],onChange:(e,value)=>{const names:string[]=value;},renderInput:params=>React.createElement(TextField,params)});
const filterSchools=createFilterOptions<typeof schoolOptions[number]>({stringify:school=>school.label});
filterSchools(schoolOptions,{inputValue:'School',getOptionLabel:o=>o.label});
// @ts-expect-error a multi-select value is an array
const badAutocompleteValue:AutocompleteProps<string,true>={options:['A'],value:'A',renderInput:()=>null};
// @ts-expect-error undeclared upstream value-mapping API is outside this application subset
const unsupportedMappedAutocomplete:AutocompleteProps<{id:number}>={options:[{id:1}],getOptionValue:o=>o.id,renderInput:()=>null};

import {TableSortLabel,Pagination,PaginationItem,usePagination,type PaginationRenderItemParams} from 'vmui-material';
import PageControl from 'vmui-material/Pagination';
import SortControl from 'vmui-material/TableSortLabel';
React.createElement(TableSortLabel,{active:true,direction:'asc',onClick:()=>{},component:'button'});
React.createElement(Pagination,{count:10,page:3,onChange:(event,page)=>{page.toFixed();},getItemAriaLabel:(type,page)=>String(page),renderItem:(item:PaginationRenderItemParams)=>React.createElement(PaginationItem,{...item,component:'a',href:'/page/'+item.page})});
React.createElement(PageControl,{defaultPage:2,showFirstButton:true});
React.createElement(SortControl,{IconComponent:()=>React.createElement('svg')});
function PageHook(){return usePagination({count:10}).items.map(item=>React.createElement(PaginationItem,item));}
// @ts-expect-error Sort direction is a bounded contract.
React.createElement(TableSortLabel,{direction:'sideways'});

import {LinearProgress,linearProgressClasses} from 'vmui-material';
import ProgressEntry from 'vmui-material/LinearProgress';
React.createElement(LinearProgress,{variant:'buffer',min:10,max:50,value:30,valueBuffer:40,color:'warning','aria-label':'Resources',ref:React.createRef<HTMLSpanElement>(),sx:{height:8}});
React.createElement(ProgressEntry,{variant:'determinate',value:50,classes:{bar1:'fill'}});
const progressClass:string=linearProgressClasses.dashed;
// @ts-expect-error unsupported progress variant
React.createElement(LinearProgress,{variant:'filled'});
// @ts-expect-error progress values are numeric
React.createElement(LinearProgress,{value:'50'});

import {Alert,AlertTitle,type AlertProps,alertClasses} from 'vmui-material';
import AlertEntry from 'vmui-material/Alert';
import TitleEntry from 'vmui-material/AlertTitle';
const alertProps:AlertProps={severity:'warning',variant:'outlined',onClose:e=>e.preventDefault(),slotProps:{message:state=>({className:state.severity}),closeButton:{'aria-label':'Dismiss',size:'small'}},sx:{mb:2}};
React.createElement(Alert,{...alertProps,ref:React.createRef<HTMLDivElement>()},React.createElement(AlertTitle,null,'Capacity'));
React.createElement(AlertEntry,{severity:'info'},React.createElement(TitleEntry,{component:'h3'},alertClasses.message));
// @ts-expect-error progress is not an alert variant
React.createElement(Alert,{variant:'progress'});
// @ts-expect-error close is a callback
React.createElement(Alert,{onClose:true});

import {Badge,type BadgeProps,badgeClasses} from 'vmui-material';
import BadgeEntry from 'vmui-material/Badge';
const badgeProps:BadgeProps={badgeContent:12,color:'error',anchorOrigin:{horizontal:'right'},slotProps:{badge:s=>({'aria-label':String(s.displayValue)})},sx:{mr:1}};
React.createElement(Badge,{...badgeProps,ref:React.createRef<HTMLSpanElement>()},'Reading list');
React.createElement(BadgeEntry,{variant:'dot',classes:{badge:badgeClasses.badge}});
// @ts-expect-error Badge has no filled variant
React.createElement(Badge,{variant:'filled'});
// @ts-expect-error max is numeric
React.createElement(Badge,{max:'99'});

import {ListItemButton as NavItem,type ListItemButtonProps} from 'vmui-material';
const navProps:ListItemButtonProps<'a'>={component:'a',href:'#contests',dense:true,selected:true,alignItems:'flex-start'};
React.createElement(NavItem,navProps);
// @ts-expect-error unsupported alignment
const badNav:ListItemButtonProps={alignItems:'stretch'};
void badNav;

import {AppBar,Toolbar,type AppBarProps,type ToolbarProps} from 'vmui-material';
import AppBarEntry from 'vmui-material/AppBar';
import ToolbarEntry from 'vmui-material/Toolbar';
const appBarProps:AppBarProps<'footer'>={component:'footer',position:'sticky',color:'default',elevation:0,enableColorOnDark:true,ref:React.createRef<HTMLElement>()};
React.createElement(AppBarEntry,appBarProps,React.createElement(ToolbarEntry,{variant:'dense',disableGutters:true}));
const toolbarProps:ToolbarProps<'nav'>={component:'nav','aria-label':'Menu',sx:{minHeight:48}};
React.createElement(Toolbar,toolbarProps);
// @ts-expect-error unsupported positioning
const badBar:AppBarProps={position:'floating'};
// @ts-expect-error gutter control is boolean
const badToolbar:ToolbarProps={disableGutters:'yes'};
void [AppBar,badBar,badToolbar];

import AccordionSummaryEntry from 'vmui-material/AccordionSummary';
import AccordionDetailsEntry from 'vmui-material/AccordionDetails';
import {AccordionSummary,AccordionDetails,type AccordionSummaryProps,type AccordionDetailsProps} from 'vmui-material';
const summaryProps:AccordionSummaryProps={expandIcon:React.createElement('i'),ref:React.createRef<HTMLButtonElement>(),slotProps:{content:s=>({'aria-label':String(s.expanded),ref:React.createRef<HTMLSpanElement>()}),root:{onClick:e=>{e.currentTarget.focus()}}},sx:{minHeight:36}};
React.createElement(AccordionSummaryEntry,summaryProps,'Contest');
const detailsProps:AccordionDetailsProps={sx:{pt:0},'aria-label':'Details'};
React.createElement(AccordionDetailsEntry,{...detailsProps,ref:React.createRef<HTMLDivElement>()});
// @ts-expect-error slots use the documented names
const badSummary:AccordionSummaryProps={slots:{missing:'div'}};
// @ts-expect-error expansion belongs to the parent, not details
const badDetails:AccordionDetailsProps={expanded:true};
void [AccordionSummary,AccordionDetails,badSummary,badDetails];

import AccordionRoot from 'vmui-material/Accordion';
import type {AccordionProps} from 'vmui-material';
const contestPanel: AccordionProps = {
  children: 'Results', defaultExpanded: true, disableGutters: true,
  onChange: (event, next) => { event.persist(); const open: boolean = next; void open },
  slotProps: {heading: {component:'h2'}, transition: {unmountOnExit:true}}
};
React.createElement(AccordionRoot, contestPanel);

import TabEntry, {type TabProps} from 'vmui-material/Tab';
import TabsEntry, {type TabsProps} from 'vmui-material/Tabs';
const learnerTabs:TabsProps<'div',string>={value:'learner-a',onChange:(_,id)=>id.toUpperCase()};
const countryTab:TabProps={label:'Countries',icon:React.createElement('svg')};
React.createElement(TabsEntry<'div',string>,learnerTabs,React.createElement(TabEntry<'button'>,countryTab));
// @ts-expect-error the fixed-layout implementation has no scroll-button variant
const unsupportedTabs:TabsProps={value:0,variant:'scrollable'};
void unsupportedTabs;

import Trail, {type BreadcrumbsProps} from 'vmui-material/Breadcrumbs';
const routeTrail:BreadcrumbsProps = {maxItems:4, color:'action.active', 'aria-label':'breadcrumb', classes:{ol:'list-none'}, separator:'›'};
React.createElement(Trail<'nav'>,routeTrail,React.createElement('a',{href:'/archive'},'Archive'));

import SnackbarFromEntry, {type SnackbarCloseReason} from "vmui-material/Snackbar";
import SnackbarBody from "vmui-material/SnackbarContent";
React.createElement(SnackbarFromEntry, {open:true,autoHideDuration:2000,message:"Link copied to clipboard",
  onClose:(_event, reason:SnackbarCloseReason) => { void reason; }});
React.createElement(SnackbarBody, {role:"status",message:"Copied"});

import MaterialStack, {type StackProps as MaterialStackProps} from "vmui-material/Stack";
import {Stack as RootStack} from "vmui-material";
const contestLinks: MaterialStackProps<"nav"> = {
  component:"nav", direction:{xs:"column",sm:"row"}, spacing:1.5,
  flexWrap:"wrap", alignItems:"center", useFlexGap:true, "aria-label":"Contest shortcuts",
};
MaterialStack(contestLinks);
RootStack({component:"a", href:"#team", ref:React.createRef<HTMLAnchorElement>()});
// @ts-expect-error Stack accepts CSS flex directions.
MaterialStack({direction:"horizontal"});

import GridEntry, {type GridProps as IMOGridProps} from "vmui-material/Grid";
import {Grid as RootGrid, gridClasses as yearGridClasses} from "vmui-material";
const items: IMOGridProps<"section">={component:"section",size:{xs:12,sm:6,md:4},offset:{sm:1},ref:React.createRef<HTMLElement>()};
GridEntry(items);
RootGrid({container:true,spacing:2});
const sizeClass:string=yearGridClasses["grid-md-4"];
void sizeClass;
// @ts-expect-error Grid size accepts numeric spans, auto, grow, or false.
GridEntry({size:"full-width"});

import WarmlRating, {type RatingProps} from 'vmui-material/Rating';
const preference: RatingProps = {size:'small',max:5,value:0,onChange:(_, v)=>{const next:number=v??0;void next;}};
WarmlRating(preference);
// @ts-expect-error Only whole-star increments are implemented.
WarmlRating({precision:0.5});

import ClickAway from "vmui-material/ClickAwayListener";
import type {ClickAwayListenerProps} from "vmui-material/ClickAwayListener";
const awayProps:ClickAwayListenerProps={children:React.createElement("aside"),mouseEvent:"onPointerUp",touchEvent:false,onClickAway:event=>void event.target};
ClickAway(awayProps);
// @ts-expect-error No document-level keyboard event in the click-away API.
ClickAway({...awayProps,mouseEvent:"onKeyDown"});

import Grow from "vmui-material/Grow";
import type {GrowProps} from "vmui-material/Grow";
const menuGrowth: GrowProps={in:true,id:"menu-fuse-list-grow",timeout:"auto",style:{transformOrigin:"0 0 0"},children:React.createElement("section"),onEntered(el){el.focus();}};
React.createElement(Grow,menuGrowth);
// @ts-expect-error Only "auto" is supported as a named duration.
React.createElement(Grow,{...menuGrowth,timeout:"fast"});

import Popper from "vmui-material/Popper";
import type {PopperProps} from "vmui-material/Popper";
const suggestionProps:PopperProps = { open:true, anchorEl:()=>document.querySelector("input"), className:"z-9999", children:React.createElement("section") };
React.createElement(Popper,suggestionProps);

import FontSlider from "vmui-material/Slider";
React.createElement(FontSlider,{value:16,marks:[{value:16,label:"100%"}],step:null,track:false,onChangeCommitted:(_,v)=>v.toFixed()});
// @ts-expect-error The toolbar slider has one thumb.
React.createElement(FontSlider,{value:[12,18]});

import RegistrationStepper from "vmui-material/Stepper";
import RegistrationStep from "vmui-material/Step";
import RegistrationLabel from "vmui-material/StepLabel";
const registrationLabel = React.createElement(RegistrationLabel,{optional:"Optional"},"About You");
const registrationStep = React.createElement(RegistrationStep,{completed:true},registrationLabel);
React.createElement(RegistrationStepper,{activeStep:1,alternativeLabel:true,sx:{mb:3}},registrationStep);
// @ts-expect-error The active step is a numeric index.
React.createElement(RegistrationStepper,{activeStep:"confirm"});

import CourseContent from "vmui-material/StepContent";
React.createElement(CourseContent,{transitionDuration:"auto",ref:React.createRef<HTMLDivElement>(),slotProps:{transition:s=>({unmountOnExit:s.last})}},"Lesson subtitle");
// @ts-expect-error Duration accepts milliseconds, enter/exit timing, or auto.
React.createElement(CourseContent,{transitionDuration:"immediate"});

import QuickRow from "vmui-material/ListItem";
React.createElement(QuickRow, { dense:true, secondaryAction:"switch", alignItems:"flex-start" });

import CssBaseline from "vmui-material/CssBaseline";
React.createElement(CssBaseline, {enableColorScheme:true}, "Document");

import { decomposeColor, getContrastRatio, hslToRgb, lighten } from "vmui-material/styles";
const channels: number[] = decomposeColor(hslToRgb("hsl(40,100%,75%)")).values;
const contrast: number = getContrastRatio(lighten("#123", 0.2), "#fff");

import createPalette, { type PaletteOptions } from "vmui-material/styles/createPalette";
const paletteOptions: PaletteOptions = {mode:"dark",primary:{main:"#59a"},tonalOffset:{light:0.1,dark:0.3}};
const readable: string = createPalette(paletteOptions).getContrastText("#eee");
// @ts-expect-error Main colors must be strings.
createPalette({primary:{main:123}});

import createTypography from "vmui-material/styles/createTypography";
const typeScale=createTypography(createPalette(),p=>({h1:{color:p.primary.main},fontSize:13,body1:{"@media (min-width:600px)":{fontSize:"1rem"}}}));
const rem: string=typeScale.pxToRem(16);
// @ts-expect-error Font size is numeric.
createTypography(createPalette(),{fontSize:"13px"});

import createTransitions from "vmui-material/styles/createTransitions";
const transitions=createTransitions({duration:{short:180}});
const animation:string=transitions.create(["margin","opacity"],{delay:"0.1s"});
// @ts-expect-error Duration must be a string or number.
transitions.create("margin",{duration:false});

import {createTheme as materialTheme, type ThemeOptions as MaterialThemeOptions} from "vmui-material/styles";
import createMaterialTheme from "vmui-material/styles/createTheme";
const assembledOptions:MaterialThemeOptions={palette:{mode:"dark",primary:{main:"#123456"}},typography:p=>({h1:{color:p.primary.main}}),cssVariables:{cssVarPrefix:"navbar",colorSchemeSelector:"class"},colorSchemes:{light:true,dark:true}};
const assembled=materialTheme(assembledOptions);
const mainColor:string=assembled.palette.primary.main;
const themeTransition:string=assembled.transitions.create("margin");
const weight:React.CSSProperties["fontWeight"]=assembled.typography.fontWeightBold;
createMaterialTheme({mixins:{toolbar:{minHeight:42}}});
// @ts-expect-error Invalid mode.
materialTheme({palette:{mode:"blue"}});
