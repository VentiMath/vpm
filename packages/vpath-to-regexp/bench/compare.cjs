'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const upstream = require('../test/fixtures/path-to-regexp-8.4.2.cjs');
const vpm = require('..');
const count = Number(process.env.COUNT || 20000), rounds = 12;
const cases = [];
const plain = value => JSON.parse(JSON.stringify(value));
function add(name, inputs, setup, iterations = count, consume) {
  const functions = [setup(upstream), setup(vpm)];
  for (const input of inputs) assert.deepEqual(plain(consume ? consume(functions[0](input)) : functions[0](input)), plain(consume ? consume(functions[1](input)) : functions[1](input)), name);
  cases.push({ name, inputs, functions, iterations, consume });
}
const shapes = {
  static: ['/health'], parameters: ['/users/:id/posts/:post'], optional: ['/users{/:id}{.:ext}'], wildcard: ['/files/*path'],
  unicode: ['/固定/:名前'], escaped: ['/files/\\:name/\\{fixed\\}'], long: ['/' + 'segment/'.repeat(100) + ':id'],
};
for (const [name, inputs] of Object.entries(shapes)) add('parse / ' + name, inputs, p => p.parse);
for (const [name, inputs] of Object.entries(shapes)) add('regexp / ' + name, inputs, p => p.pathToRegexp, Math.min(count, 5000), x => ({source:x.regexp.source, flags:x.regexp.flags, keys:x.keys}));
add('regexp / 32 alternatives', ['{/a}{/b}{/c}{/d}{/e}'], p => p.pathToRegexp, Math.min(count, 500), x => ({source:x.regexp.source, keys:x.keys}));
add('regexp / path array', [['/a/:id', '/b/:id', '/c/:id', '/d/:id']], p => p.pathToRegexp, Math.min(count, 2000), x => ({source:x.regexp.source, keys:x.keys}));
const matchCases = [
  ['static hit', '/health', ['/health', '/HEALTH/']], ['static miss', '/health', ['/missing']],
  ['parameter', '/users/:id', ['/users/alice', '/users/bob']], ['parameter miss', '/users/:id', ['/posts/alice']],
  ['two parameters', '/users/:id/posts/:post', ['/users/alice/posts/123']], ['percent decoding', '/users/:id', ['/users/caf%C3%A9', '/users/a%2Fb']],
  ['optional', '/users{/:id}{.:ext}', ['/users', '/users/123.json']], ['wildcard', '/files/*path', ['/files/a/b/c', '/files/caf%C3%A9/a%2Fb/c']],
  ['prefix', '/users/:id', ['/users/alice/posts/123'], {end:false}], ['decode false', '/files/*path', ['/files/a%2Fb/c'], {decode:false}],
  ['custom decode', '/files/*path', ['/files/a/b/c'], {decode:x => x.toUpperCase()}], ['path array', ['/a/:id', '/b/:id'], ['/b/123']],
  ['Unicode', '/固定/:名前', ['/固定/名前']], ['long failure', '/:a-:b', ['/'+'x'.repeat(1000)+'/!']],
];
for (const [name, route, inputs, options] of matchCases) add('match / '+name, inputs, p => p.match(route, options));
for (const [name, route, inputs, options] of matchCases.filter(x => ['static hit', 'parameter', 'optional', 'wildcard'].includes(x[0]))) {
  add('matcher build / '+name, [route], p => route => p.match(route, options), Math.min(count, 5000), fn => inputs.map(input => fn(input)));
}
for (const [name, route, inputs, options] of [
  ['static', '/health', [{}]], ['parameter', '/users/:id', [{id:'alice'}, {id:'雪'}]],
  ['two parameters', '/users/:id/posts/:post', [{id:'alice',post:'123'}]], ['optional', '/users{/:id}{.:ext}', [{}, {id:'123',ext:'json'}]],
  ['wildcard', '/files/*path', [{path:['a','b','c']}, {path:['雪','a/b','c']}]], ['encode false', '/files/*path', [{path:'a/b/c'}], {encode:false}],
]) {
  add('template build / '+name, [route], p => s => p.compile(s,options), Math.min(count,5000), fn=>inputs.map(input=>fn(input)));
  add('generate / '+name, inputs, p=>p.compile(route,options));
}
for (const name of ['parameters', 'optional', 'escaped', 'long']) {
  const input = upstream.parse(shapes[name][0]);
  add('stringify / '+name, [input], p=>p.stringify);
}
let checksum = 0;
function consume(value, convert) {
  if (convert) value = convert(value);
  if (typeof value === 'string') return value.length;
  if (value === false) return 0;
  return JSON.stringify(value).length;
}
function measure(entry, implementation, iterations) {
  const retained = new Array(256), fn = entry.functions[implementation];
  const start = performance.now();
  for (let i=0;i<iterations;i++) retained[i&255]=fn(entry.inputs[i%entry.inputs.length]);
  const elapsed = performance.now()-start;
  for (const value of retained) if(value!==undefined) checksum += consume(value,entry.consume);
  return elapsed*1e6/iterations;
}
for (const entry of cases) for (const i of [0,1]) measure(entry,i,Math.min(entry.iterations,2000));
const rows=[];
for (const entry of cases) {
  for (const i of [0,1]) measure(entry,i,Math.min(entry.iterations,5000));
  const samples=[[],[]];
  for(let round=0;round<rounds;round++) for(const i of round%2?[1,0]:[0,1]) samples[i].push(measure(entry,i,entry.iterations));
  const medians=samples.map(a=>{const s=a.slice().sort((a,b)=>a-b);return(s[5]+s[6])/2;});
  rows.push({case:entry.name,iterations:entry.iterations,upstreamNs:medians[0],vpmNs:medians[1],ratio:medians[1]/medians[0],samples});
}
const hash=file=>createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,file))).digest('hex');
const result={recordedAt:new Date().toISOString(),runtime:process.versions,platform:process.platform,arch:process.arch,count,rounds,sampleOrder:'alternating A/B and B/A',corpusWarmup:'min(iterations,2000)',caseWarmup:'min(iterations,5000)',units:'nanoseconds/call including retention writes, excluding final result consumption',hashes:Object.fromEntries(['../index.js','../regex.cjs','../test/fixtures/path-to-regexp-8.4.2.cjs','compare.cjs'].map(file=>[file,hash(file)])),checksum,rows};
if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(result,null,2)+'\n');
console.table(rows.map(row=>({case:row.case,upstream:Math.round(row.upstreamNs),vpm:Math.round(row.vpmNs),ratio:row.ratio.toFixed(2)})));
console.log('Consumed checksum:',checksum);
