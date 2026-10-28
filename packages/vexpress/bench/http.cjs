'use strict';
process.env.NODE_ENV = 'test'; process.env.DEBUG = '';
const http = require('node:http');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { performance } = require('node:perf_hooks');
const load = require('./load.cjs');
const implementations = [load(), load(true), require('..')];
const count = Number(process.env.COUNT || 1000), concurrency = 8;
const orders = [[0,1,2], [0,2,1], [1,0,2], [1,2,0], [2,0,1], [2,1,0]];
const json = JSON.stringify({ value: 'VentiMath', count: 42 });
const routes = [
  { name: 'GET JSON', url: '/json', expected: json },
  { name: 'GET parameter/query JSON', url: '/users/42?q=one', expected: '{"id":"42","q":"one"}' },
  { name: 'POST JSON parse and echo', url: '/body', body: json, expected: json },
];
let checksum = 0;
async function main() {
  const servers = [], clients = [];
  try {
    for (const E of implementations) {
      const a = E(); a.disable('x-powered-by');
      a.get('/json', (req,res) => res.json({ value: 'VentiMath', count: 42 }));
      a.get('/users/:id', (req,res) => res.json({ id: req.params.id, q: req.query.q }));
      a.post('/body', E.json(), (req,res) => res.json(req.body));
      const server = http.createServer(a); servers.push(server);
      await new Promise((resolve,reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',resolve); });
      clients.push(new http.Agent({ keepAlive: true, maxSockets: concurrency }));
    }
    function request(index, route) {
      return new Promise((resolve,reject) => {
        const req = http.request({ hostname:'127.0.0.1',port:servers[index].address().port,path:route.url,method:route.body ? 'POST':'GET',agent:clients[index],
          headers:route.body ? {'content-type':'application/json','content-length':Buffer.byteLength(route.body)} : {} }, res => {
          let body=''; res.setEncoding('utf8'); res.on('data',chunk => { body+=chunk; }); res.on('error',reject);
          res.on('end',() => { if(res.statusCode!==200) reject(new Error('unexpected status '+res.statusCode)); else resolve(body); });
        });
        req.on('error',reject); req.end(route.body);
      });
    }
    async function measure(index, route, total) {
      const retained = new Array(concurrency); let sent=0;
      const start=performance.now();
      await Promise.all(Array.from({length:concurrency},(_,slot) => (async () => {
        while(sent++<total) retained[slot]=await request(index,route);
      })()));
      const duration=performance.now()-start;
      for(const value of retained) { assert.equal(value,route.expected); checksum+=value.length; }
      return duration*1000/total;
    }
    const rows=[];
    for(const route of routes) {
      for(let i=0;i<3;i++) assert.equal(await request(i,route),route.expected);
      for(let i=0;i<3;i++) await measure(i,route,200);
      const samples=[[],[],[]];
      for(const order of orders) for(const index of order) samples[index].push(await measure(index,route,count));
      const medians=samples.map(values => {const s=values.slice().sort((a,b)=>a-b);return(s[2]+s[3])/2;});
      rows.push({case:route.name,upstreamUs:medians[0],vpmDependenciesUs:medians[1],vpmUs:medians[2],samples});
    }
    const result={recordedAt:new Date().toISOString(),runtime:process.versions,platform:process.platform,arch:process.arch,count,concurrency,
      units:'batch elapsed microseconds/completed request, eight concurrent keep-alive clients, local loopback; includes client/network overhead, not individual latency',
      rounds:6,sampleOrder:'all six permutations',hashes:require('./evidence.cjs')(),checksum,rows};
    if(process.env.OUTPUT) fs.writeFileSync(process.env.OUTPUT,JSON.stringify(result,null,2)+'\n');
    console.table(rows.map(r=>({case:r.case,upstream:r.upstreamUs.toFixed(2),dependencies:r.vpmDependenciesUs.toFixed(2),VPM:r.vpmUs.toFixed(2)})));
  } finally {
    for(const client of clients) client.destroy();
    for(const server of servers) {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
