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
