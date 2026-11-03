'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..');
const upstream=path.resolve(root,'../../scripts/google-http-conformance/node_modules/google-auth11');
const cases=[
 {name:'configured universe lookup',async:true,make:file=>{const {GoogleAuth}=require(file),auth=new GoogleAuth({universeDomain:'configured.example'});return()=>auth.getUniverseDomain();},validate:v=>assert.equal(v,'configured.example')},
 {name:'cached credential universe lookup',async:true,make:file=>{const {GoogleAuth}=require(file),auth=new GoogleAuth({authClient:{universeDomain:'credential.example'}});return()=>auth.getUniverseDomain();},validate:v=>assert.equal(v,'credential.example')},
 {name:'universe after unavailable credential lookup',async:true,make:file=>{const {GoogleAuth}=require(file),auth=new GoogleAuth(),error=Error('fixture credential unavailable');auth.getClient=()=>Promise.reject(error);return()=>auth.getUniverseDomain();},validate:v=>assert.equal(v,'googleapis.com')},
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['lib/application/googleauth.js','lib/application/client.js','index.js','package.json','bench/universe.cjs','../../scripts/google-http-conformance/package-lock.json','../../scripts/google-http-conformance/node_modules/google-auth11/build/src/auth/googleauth.js']}).catch(error=>{console.error(error);process.exitCode=1});
