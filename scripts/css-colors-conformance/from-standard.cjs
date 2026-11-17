'use strict';
// Input: a saved https://www.w3.org/TR/css-color-3/ document, not package source.
const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.argv[2],'utf8');
const matches=[...source.matchAll(/<td><dfn id=[^>]+>([a-z]+)<\/dfn>\s*<td[^>]*>(#[0-9a-fA-F]{6})/g)].map(m=>[m[1],m[2].toLowerCase()]);
const entries=[...new Map(matches)];
assert.equal(entries.length,147,'CSS3 table shape changed; review before rebuilding');
entries.push(['rebeccapurple','#663399']); // CSS Color Level 4, named colors.
process.stdout.write(JSON.stringify(Object.fromEntries(entries.sort(([a],[b])=>a.localeCompare(b))),null,2)+'\n');
