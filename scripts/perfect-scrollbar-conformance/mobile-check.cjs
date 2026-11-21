'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {compileFunction} = require('node:vm');
const Detector = require('mobile-detect');
const {current, capabilityFirst} = require('./mobile-gate.cjs');
const [corpus, checkout, ref='origin/main'] = process.argv.slice(2);

// The optional private-checkout run evaluates the gate directly from the
// selected Git revision without importing the app or altering its settings.
let app;
if (checkout) {
  const source = execFileSync('git',['show',ref+':src/@fuse/core/FuseScrollbars/FuseScrollbars.tsx'],{cwd:checkout,encoding:'utf8'});
  const gate = source.match(/^const hasWindow = [\s\S]*?^const isMobile = [^;]+;/m);
  assert.ok(gate, 'review FuseScrollbars after a change to the module-level decision');
  const evaluate = compileFunction(gate[0]+'\nreturn isMobile;', ['window','navigator','Capacitor','MobileDetect']);
  app = (browser,native) => evaluate(browser,browser?.navigator,{isNativePlatform:native},Detector);
}
const examples = [
  ['desktop', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36',false],
  ['desktop-style iPad', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',false],
  ['iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1',true],
  ['Android tablet', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/130.0 Safari/537.36',true],
  ['Opera Mini', 'Opera Mini/7.5',true],
  ['feature phone', 'ALCATEL_3020D/1.0 ObigoInternetBrowser/Q03C',true],
  ['empty', '',false],
];
function check(ua, expectedMobile) {
  for(const touchStart of [false,true]) for(const points of [0,2]) for(const native of [false,true]) {
    const browser={navigator:{userAgent:ua,maxTouchPoints:points}};
    if(touchStart) browser.ontouchstart=null;
    const expected=Boolean(touchStart || points || native || expectedMobile);
    let lookups=0;
    class Counted extends Detector {constructor(value){super(value);lookups++;}}
    assert.equal(current(browser,()=>native),expected);
    assert.equal(capabilityFirst(browser,()=>native,Counted),expected);
    assert.equal(lookups,touchStart || points || native ? 0 : 1);
    if(app) assert.equal(app(browser,()=>native),expected);
  }
}
for(const [,ua,mobile] of examples) check(ua,mobile);
const unexpected = ()=>{ throw Error('Server consulted a browser signal'); };
for(const gate of [current,capabilityFirst,app].filter(Boolean)) assert.equal(gate(undefined,unexpected),false);
if (corpus && corpus!=='-') {
  const file=fs.readFileSync(corpus);
  assert.equal(createHash('sha256').update(file).digest('hex'),'5d2a75e99f86bdf7d2484fb42965edf58db82ead713e6ceaacf27abe1b2101b6');
  const text=file.toString('utf8');
  const rows=Object.values(JSON.parse(text.slice(text.indexOf('{'),text.indexOf('};')+1))).flat();
  const uas=new Set(rows.map(row=>row.user_agent));
  const shortPattern=/android|iphone|ipad|ipod|mobile|silk\/|kindle|blackberry|opera mini/i;
  let mobile=0, missed=0, extra=0;
  for(const ua of uas) {
    const result=Boolean(new Detector(ua).mobile());
    check(ua,result);
    mobile+=Number(result);
    missed+=Number(result&&!shortPattern.test(ua));
    extra+=Number(!result&&shortPattern.test(ua));
  }
  assert.deepEqual([uas.size,mobile,missed,extra],[1590,1523,72,0]);
  console.log(uas.size*8+' capability/UA combinations agree; desktop/touch/native configurations are simulated.');
}
console.log('Scrollbar decision, SSR and fallback call counts passed'+(app?' against the actual app gate.':'.'));
