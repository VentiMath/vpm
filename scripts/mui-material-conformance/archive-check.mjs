import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import React from "react";
import { renderToString } from "react-dom/server";
import * as api from "vmui-material";
import { ThemeProvider, createTheme } from "vmui-system";
const require = createRequire(import.meta.url),
  c = require("vmui-material");
assert.equal(api.Button, c.Button);
const packageRoot = new URL('.', 'file://' + require.resolve('vmui-material/package.json'));
function checkTargets(value) {
  if (typeof value === 'string') {
    assert.ok(fs.existsSync(new URL(value, packageRoot)), 'Missing Material export target: ' + value);
  } else for (const target of Object.values(value)) checkTargets(target);
}
checkTargets(require('vmui-material/package.json').exports);

for (const key of Object.keys(require("vmui-material/package.json").exports)) {
  if (key === "." || key === "./package.json") continue;
  const id = "vmui-material/" + key.slice(2),
    a = require(id),
    b = await import(id);
  if(key === "./styles"){assert.equal(a.useTheme,b.useTheme);assert.equal(a.ThemeProvider,b.ThemeProvider);continue;}
  assert.equal(a.default, b.default, id);
  assert.notEqual(a.default, undefined);
}
const theme = createTheme({
  components: {
    MuiButton: {
      defaultProps: { variant: "contained" },
      styleOverrides: { root: { borderRadius: 9 } },
    },
  },
});
const html = renderToString(
  React.createElement(
    ThemeProvider,
    { theme },
    React.createElement(
      api.Button,
      { disabled: true, disableRipple: true },
      "Join contest",
    ),
  ),
);
assert.match(html, /disabled=""/);
assert.match(html, /border-radius:9px/);
assert.match(html, /MuiButton-contained/);
for (const name of [
  "@mui/material",
  "@mui/system",
  "@mui/utils",
  "@babel/runtime",
  "@emotion/react",
  "prop-types",
])
  assert.throws(() => require.resolve(name));
const text = renderToString(React.createElement(React.Fragment, null,
  React.createElement(api.Typography, {variant: "h2"}, "Contest"),
  React.createElement(api.Link, {href: "/contest"}, "Details"),
  React.createElement(api.createSvgIcon(React.createElement("path", {d:"M1 1h20v20H1z"}),"Contest"), {titleAccess: "Contest icon"})));
assert.match(text, /<h2/);assert.match(text, /href="\/contest"/);assert.match(text, /<title>Contest icon<\/title>/);
const seen = new Set();
function check(name) {
  if (seen.has(name)) return;
  seen.add(name);
  for (const [dep, version] of Object.entries(
    require(name + "/package.json").dependencies || {},
  )) {
    assert.ok(version.startsWith("file:"), dep);
    check(dep);
  }
}
check("vmui-material");
console.log(
  "All Material component entries, SSR and " +
    seen.size +
    "-package VPM closure pass",
);

const surfaces=renderToString(React.createElement(api.Paper,{elevation:2},React.createElement(api.Divider,{orientation:"vertical"}),React.createElement(api.Icon,null,"palette")));
assert.match(surfaces,/MuiPaper-elevation2/);assert.match(surfaces,/aria-orientation="vertical"/);assert.match(surfaces,/notranslate/);

const forms=renderToString(React.createElement(api.FormControl,{required:true,error:true},React.createElement(api.FormLabel,{htmlFor:'field'},'Contest'),React.createElement(api.FormHelperText,null,' ')));
assert.match(forms,/Mui-required/);assert.match(forms,/Mui-error/);assert.match(forms,/aria-hidden="true"/);
assert.equal(api.useFormControl,require('vmui-material/FormControl/useFormControl').default);

const inputs=renderToString(React.createElement(api.FormControl,{required:true},React.createElement(api.InputBase,{id:'field','aria-label':'Contest',defaultValue:'AMC',multiline:true,rows:2})));
assert.match(inputs,/<textarea[^>]*aria-label="Contest"/);assert.match(inputs,/>AMC<\/textarea>/);assert.equal((inputs.match(/<textarea/g)||[]).length,1);
assert.equal(api.InputBase,require('vmui-material/InputBase').default);

for(const name of ['Input','OutlinedInput']){const html=renderToString(React.createElement(api[name],{label:name==='OutlinedInput'?'Contest':undefined,defaultValue:'AMC'}));assert.match(html,new RegExp('Mui'+name+'-root'));assert.equal(api[name],require('vmui-material/'+name).default);}

const decorated=renderToString(React.createElement(api.FormControl,null,React.createElement(api.InputLabel,{htmlFor:'fee'},'Fee'),React.createElement(api.OutlinedInput,{id:'fee',label:'Fee',defaultValue:0,startAdornment:React.createElement(api.InputAdornment,{position:'start'},'$')})));
assert.match(decorated,/data-shrink="true"/);assert.match(decorated,/MuiInputAdornment-positionStart/);assert.match(decorated,/for="fee"/);

const textField=renderToString(React.createElement(api.TextField,{id:'contest',label:'Contest',helperText:'Name',required:true}));
assert.match(textField,/id="contest-helper-text"/);assert.match(textField,/aria-describedby="contest-helper-text"/);assert.match(textField,/for="contest"/);
assert.equal(api.TextField,require('vmui-material/TextField').default);

const list=renderToString(React.createElement(api.MenuList,null,React.createElement(api.ListSubheader,null,'Contests'),React.createElement(api.MenuItem,{selected:true},React.createElement(api.ListItemIcon,null,'*'),React.createElement(api.ListItemText,{primary:'AMC'}))));
assert.match(list,/role="menu"/);assert.match(list,/role="menuitem"/);assert.match(list,/Mui-selected/);
assert.equal(renderToString(React.createElement(api.Menu,{open:false},'hidden')),'');

assert.equal(api.Select,require('vmui-material/Select').default);
const dropdown=renderToString(React.createElement(api.TextField,{id:'schedule',select:true,value:'once',label:'Schedule'},React.createElement(api.MenuItem,{value:'once'},'Once')));
assert.match(dropdown,/role="combobox"/);assert.match(dropdown,/>Once<\/div>/);

for(const name of ['Checkbox','FormControlLabel'])assert.equal(api[name],require('vmui-material/'+name).default);
const checkbox=renderToString(React.createElement(api.FormControlLabel,{label:'Confirm',control:React.createElement(api.Checkbox,{checked:true,required:true,name:'consent'})}));
assert.match(checkbox,/type="checkbox"/);assert.match(checkbox,/checked=""/);assert.match(checkbox,/required=""/);

assert.equal(api.Switch,require('vmui-material/Switch').default);
assert.equal(api.switchClasses,require('vmui-material/switchClasses').default);
const switchHtml=renderToString(React.createElement(api.Switch,{defaultChecked:true,'aria-label':'Email'}));
assert.match(switchHtml,/role="switch"/);assert.match(switchHtml,/checked=""/);

assert.equal(api.Chip,require('vmui-material/Chip').default);
assert.equal(api.chipClasses,require('vmui-material/chipClasses').default);
const chipHtml=renderToString(React.createElement(api.Chip,{label:'Roommate',onDelete(){}}));
assert.match(chipHtml,/MuiChip-deleteIcon/);assert.match(chipHtml,/role="button"/);

assert.equal(api.Avatar,require('vmui-material/Avatar').default);
assert.equal(api.avatarClasses,require('vmui-material/avatarClasses').default);
assert.match(renderToString(React.createElement(api.Avatar,{src:'/student.png',alt:'Student'})),/alt="Student"/);

assert.equal(api.CircularProgress,require('vmui-material/CircularProgress').default);
assert.equal(api.circularProgressClasses,require('vmui-material/circularProgressClasses').default);
assert.match(renderToString(React.createElement(api.CircularProgress,{variant:'determinate',value:25})),/aria-valuenow="25"/);

assert.equal(api.Skeleton,require('vmui-material/Skeleton').default);
assert.equal(api.skeletonClasses,require('vmui-material/skeletonClasses').default);
assert.match(renderToString(React.createElement(api.Skeleton,{variant:'rounded',height:112})),/MuiSkeleton-rounded/);

assert.equal(api.Container,require('vmui-material/Container').default);
assert.equal(api.containerClasses.root,require('vmui-material/containerClasses').default.root);
assert.match(renderToString(React.createElement(api.Container,{maxWidth:'sm',sx:{py:4}},'WARML')),/MuiContainer-maxWidthSm/);

assert.equal(api.Card,require('vmui-material/Card').default);
assert.equal(api.CardContent,require('vmui-material/CardContent').default);
assert.equal(api.cardClasses.root,require('vmui-material/cardClasses').default.root);
assert.equal(api.cardContentClasses.root,require('vmui-material/cardContentClasses').default.root);
assert.match(renderToString(React.createElement(api.Card,{variant:'outlined'},React.createElement(api.CardContent,null,'Exam'))),/MuiCardContent-root/);

assert.equal(api.CardActionArea,require('vmui-material/CardActionArea').default);
assert.match(renderToString(React.createElement(api.CardActionArea,{href:'/exam',disableRipple:true},'Open')),/MuiCardActionArea-focusHighlight/);

assert.equal(api.AvatarGroup,require('vmui-material/AvatarGroup').default);
assert.equal(api.avatarGroupClasses.root,require('vmui-material/avatarGroupClasses').default.root);
assert.match(renderToString(React.createElement(api.AvatarGroup,{max:2},['A','B','C'].map(x=>React.createElement(api.Avatar,{key:x},x)))),/>\+2</);

assert.equal(api.Drawer, require('vmui-material/Drawer').default);
assert.equal(api.drawerClasses, require('vmui-material/drawerClasses').default);
assert.match(renderToString(React.createElement(api.Drawer,{variant:'permanent',open:false},'Practice')), /MuiDrawer-docked/);

assert.equal(api.SwipeableDrawer, require('vmui-material/SwipeableDrawer').default);
assert.match(renderToString(React.createElement(api.SwipeableDrawer,{variant:'permanent',onOpen(){},onClose(){}},'Navigation')),/MuiDrawer-docked/);

for(const name of ["Table", "TableHead", "TableBody", "TableFooter", "TableRow", "TableCell", "TableContainer"]) assert.equal(api[name],require("vmui-material/"+name).default);
assert.match(renderToString(React.createElement(api.Table,null,React.createElement(api.TableHead,null,React.createElement(api.TableRow,null,React.createElement(api.TableCell,{sortDirection:"asc"},"Score"))))),/aria-sort="ascending"/);

assert.equal(api.Autocomplete,require('vmui-material/Autocomplete').default);assert.equal(api.createFilterOptions,require('vmui-material/Autocomplete').createFilterOptions);assert.equal(api.autocompleteClasses,require('vmui-material/autocompleteClasses').default);
assert.match(renderToString(React.createElement(api.Autocomplete,{options:['School'],multiple:true,freeSolo:true,value:['New school'],renderInput:p=>React.createElement(api.TextField,{...p,label:'Schools'})})),/role="combobox"/);

const navigation=renderToString(React.createElement(React.Fragment,null,React.createElement(api.TableSortLabel,{active:true},'Resource'),React.createElement(api.Pagination,{count:100,page:10,showLastButton:true})));
assert.match(navigation,/MuiTableSortLabel-root/);assert.match(navigation,/aria-current="page"/);assert.match(navigation,/Go to last page/);assert.equal(api.usePagination,require('vmui-material/usePagination').default);

const linear=renderToString(React.createElement(api.LinearProgress,{variant:'buffer',min:10,max:50,value:30,valueBuffer:40,'aria-label':'Progress'}));assert.match(linear,/aria-valuenow="30"/);assert.match(linear,/translateX\(-25%\)/);assert.equal(api.LinearProgress,require('vmui-material/LinearProgress').default);

const alertHtml=renderToString(React.createElement(api.Alert,{severity:'warning',onClose:()=>{},closeText:'Dismiss'},React.createElement(api.AlertTitle,null,'Capacity')));
assert.match(alertHtml,/role="alert"/);assert.match(alertHtml,/aria-label="Dismiss"/);assert.match(alertHtml,/MuiAlertTitle-root/);
assert.equal((await import('vmui-material/Alert')).default,api.Alert);assert.equal((await import('vmui-material/AlertTitle')).default,api.AlertTitle);

const badgeHtml=renderToString(React.createElement(api.Badge,{badgeContent:120,color:'error'},'Reading list'));
assert.match(badgeHtml,/>99\+<\/span>/);assert.match(badgeHtml,/aria-hidden="true"/);assert.equal((await import('vmui-material/Badge')).default,api.Badge);

assert.equal(api.ListItemButton, (await import("vmui-material/ListItemButton")).default);
assert.match(renderToString(React.createElement(api.ListItemButton,{href:"#contests",disableRipple:true},"Contests")), /href="#contests"/);

for (const name of ['Tab','Tabs']) {
  assert.equal((await import('vmui-material/'+name)).default, api[name]);
  assert.equal(require('vmui-material/'+name).default, api[name]);
}
const learnerTabs = renderToString(React.createElement(api.Tabs, {value:'learner-a'},
  React.createElement(api.Tab, {value:'learner-a', label:'Learner'})));
assert.match(learnerTabs, /role="tablist"/);
assert.match(learnerTabs, /aria-selected="true"/);

assert.equal((await import('vmui-material/Breadcrumbs')).default,api.Breadcrumbs);
assert.equal(require('vmui-material/Breadcrumbs').default,api.Breadcrumbs);
assert.match(renderToString(React.createElement(api.Breadcrumbs,{'aria-label':'breadcrumb'},React.createElement('a',{href:'/archive'},'Archive'))),/aria-label="breadcrumb"/);

assert.equal((await import("vmui-material/Slider")).default, api.Slider);
assert.equal(require("vmui-material/Slider").default, api.Slider);
assert.equal((await import("vmui-material/sliderClasses")).default, api.sliderClasses);
assert.equal(require("vmui-material/sliderClasses").getSliderUtilityClass("thumb"), api.sliderClasses.thumb);

for (const name of ["Stepper", "Step", "StepLabel", "StepContent"]) {
  assert.equal((await import("vmui-material/" + name)).default, api[name]);
  assert.equal(require("vmui-material/" + name).default, api[name]);
}
assert.equal(api.getStepLabelUtilityClass("disabled"), "Mui-disabled");

assert.equal((await import("vmui-material/stepContentClasses")).default,api.stepContentClasses);
assert.equal(require("vmui-material/stepContentClasses").getStepContentUtilityClass("last"),api.stepContentClasses.last);

assert.equal(api.ListItem,(await import("vmui-material/ListItem")).default);
assert.equal(require("vmui-material/listItemClasses").default.root,api.listItemClasses.root);

assert.equal(api.CssBaseline, (await import("vmui-material/CssBaseline")).default);
assert.equal(api.CssBaseline, require("vmui-material/CssBaseline").default);

const esmColors = await import("vmui-material/styles");
const cjsColors = require("vmui-material/styles");
for (const name of ["alpha", "darken", "decomposeColor", "emphasize", "getContrastRatio", "getLuminance", "hexToRgb", "hslToRgb", "lighten", "recomposeColor", "rgbToHex"]) {
  assert.equal(esmColors[name], require("vmui-system/colorManipulator")[name]);
  assert.equal(cjsColors[name], esmColors[name]);
}

const paletteModule = await import("vmui-material/styles/createPalette");
assert.equal(paletteModule.default, require("vmui-material/styles/createPalette").default);
assert.equal(paletteModule.default({mode:"dark"}).background.paper, "#121212");

const typographyModule = await import("vmui-material/styles/createTypography");
assert.equal(typographyModule.default, require("vmui-material/styles/createTypography").default);
assert.equal(typographyModule.default(paletteModule.default(),{}).pxToRem(16),"1rem");
