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
