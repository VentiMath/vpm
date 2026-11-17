'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),colors=require(process.env.VCOLORS_ENTRY||'../index.cjs');
test('all 148 standard colors are lowercase six-digit RGB values',()=>{assert.equal(Object.keys(colors).length,148);for(const [name,value] of Object.entries(colors)){assert.match(name,/^[a-z]+$/);assert.match(value,/^#[a-f0-9]{6}$/)}});
test('standard aliases and the CSS4 named color are present',()=>{assert.equal(colors.cyan,colors.aqua);assert.equal(colors.magenta,colors.fuchsia);assert.equal(colors.gray,colors.grey);assert.equal(colors.darkgray,colors.darkgrey);assert.equal(colors.rebeccapurple,'#663399');assert.equal(colors.aliceblue,'#f0f8ff')});
test('context-dependent and non-color names are not own RGB entries',()=>{for(const name of ['transparent','currentColor','inherit','CanvasText','constructor','__proto__','toString','RED',''])assert.equal(Object.hasOwn(colors,name),false)});
test('ESM, CommonJS and JSON entries share equal data',async()=>{assert.deepEqual((await import('../index.mjs')).default,colors);assert.deepEqual(require('../index.json'),colors)});
