'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const parse = require('..');
const upstream = require('./fixtures/minimist-1.2.8.cjs');
test('prototype-shaped ordinary option names work without inherited values', () => {
  for (const key of ['toString','hasOwnProperty','valueOf','isPrototypeOf','__defineGetter__']) {
    assert.throws(() => upstream(['--'+key, 'hello']));
    assert.deepEqual(parse(['--'+key, 'hello']), { _: [], [key]: 'hello' });
    assert.deepEqual(parse([], { default: { [key]: 'fallback' } }), { _: [], [key]: 'fallback' });
  }
});
test('prototype navigation is ignored in arguments, aliases and defaults', () => {
  for (const key of ['__proto__.vpmTest','constructor.prototype.vpmTest','x.__proto__.vpmTest','prototype.vpmTest','_.concat.vpmTest','--.x']) {
    assert.deepEqual(parse(['--'+key,'yes']), { _: [] });
    assert.deepEqual(parse([], { default: { [key]: 'yes' } }), { _: [] });
    const result = parse(['--safe','yes'], {alias:{safe:key}});
    assert.equal(result.safe,'yes');
  }
  assert.equal(Object.prototype.vpmTest,undefined);
  assert.equal(Array.prototype.concat.vpmTest,undefined);
});
test('positional and tail arrays cannot be replaced or populated as options', () => {
  assert.deepEqual(parse(['--_=oops','--_.x=bad','tail','--','rest'], {'--':true}), {_:['tail'],'--':['rest']});
  assert.deepEqual(parse(['--x=ok','tail'], {alias:{x:'_'},default:{_:'bad'}}), {_:['tail'],x:'ok'});
});
test('overlapping and cyclic alias graphs stay coherent', () => {
  const aliases={a:'b',b:['c','d'],d:'a'};
  for (const name of ['a','b','c','d']) {
    const result=parse(['--'+name,'1','--c','2'], {alias:aliases});
    for (const key of ['a','b','c','d']) assert.deepEqual(result[key],[1,2]);
  }
  assert.notDeepEqual(upstream(['--a','1','--b','2'],{alias:{a:'b',b:'c'}}),parse(['--a','1','--b','2'],{alias:{a:'b',b:'c'}}));
});
test('boolean classification propagates through aliases including equals false', () => {
  const options={alias:{verbose:'v',v:'loud'},boolean:'verbose'};
  for (const key of ['verbose','v','loud']) {
    const result=parse(['--'+key+'=false'], options);
    for(const name of ['verbose','v','loud'])assert.equal(result[name],false);
  }
  assert.equal(upstream(['--v=false'],{alias:{verbose:'v'},boolean:'verbose'}).v,'false');
});
test('string aliases and defaults propagate over complete alias groups', () => {
  assert.deepEqual(parse(['--c','001'],{alias:{a:'b',b:'c'},string:'a'}),{_:[],a:'001',b:'001',c:'001'});
  assert.deepEqual(parse([],{alias:{a:'b',b:'c'},boolean:'a',default:{c:true}}),{_:[],a:true,b:true,c:true});
});
test('dotted booleans use full paths instead of unrelated leaf names', () => {
  assert.deepEqual(parse(['--a.x=one','--a.x=two'],{boolean:'x'}),{_:[],x:false,a:{x:['one','two']}});
  assert.deepEqual(parse(['--a.x=false','--a.x=true'],{boolean:'a.x'}),{_:[],a:{x:true}});
});
test('structural path collisions fail explicitly without changing inputs', () => {
  for(const args of [['--x=1','--x.y=2'],['--x=1','--x=2','--x.y=3']])assert.throws(()=>parse(args),/conflicting argument paths/);
  const object=Object.freeze({old:1});
  assert.throws(()=>parse([],{default:{x:object,'x.new':2}}),/conflicting argument paths/);
  assert.deepEqual(object,{old:1});
});
test('repetition never appends to a caller-owned default array', () => {
  const values=Object.freeze([1]);
  const options={boolean:'x',default:{x:values},alias:{x:'y'}};
  assert.deepEqual(parse(['--y','2'],options)._,[2]);
  assert.deepEqual(values,[1]);
});
test('option and argument getters are read once and snapshotted before callbacks', () => {
  const counts={};const args=['--x','1','--y','2'];
  const values={string:['x'],boolean:['flag'],alias:{x:'xx'},default:{z:3},stopEarly:false,'--':false,unknown(){args[3]='changed';values.string[0]='y';return true;}};
  const options={};for(const key of Object.keys(values))Object.defineProperty(options,key,{get(){counts[key]=(counts[key]||0)+1;return values[key];}});
  const result=parse(args,options);
  assert.equal(result.x,'1');assert.equal(result.y,2);
  for(const count of Object.values(counts))assert.equal(count,1);
  let reads=0;const getterArgs=['--x'];Object.defineProperty(getterArgs,1,{get(){reads++;return '5';}});
  assert.equal(parse(getterArgs).x,5);assert.equal(reads,1);
});
test('inherited options and configuration entries are ignored', () => {
  assert.deepEqual(parse(['--x','5'],Object.create({string:'x',boolean:'y',stopEarly:true})),{_:[],x:5});
  assert.deepEqual(parse([],{default:Object.create({x:3}),alias:Object.create({x:'y'})}),{_:[]});
});
test('defaults retain opaque values and do not coerce them', () => {
  const sentinel={toString(){throw new Error('coercion');}};
  assert.equal(parse([],{default:{x:sentinel}}).x,sentinel);
  assert.equal(parse([],{boolean:'x',default:{x:sentinel}}).x,sentinel);
  assert.deepEqual(parse([],{boolean:'x',default:{x:'123'}}),upstream([],{boolean:'x',default:{x:'123'}}));
});
test('invalid inputs fail without value coercion or callback effects', () => {
  let touched=0;const evil={toString(){touched++;throw new Error('coercion');}};
  for(const args of [null,{},'--x',[evil],[NaN],[Infinity],[undefined]])assert.throws(()=>parse(args),TypeError);
  for(const opts of [true,[],{string:5},{boolean:[false]},{alias:[]},{alias:{x:[1]}},{default:null},{unknown:true},{stopEarly:1},{'--':'true'}])assert.throws(()=>parse([],opts),TypeError);
  assert.equal(touched,0);
});
test('unknown callbacks see original tokens and their exceptions propagate', () => {
  const seen=[];
  assert.deepEqual(parse(['--x=1','-ab','word','--','tail'],{unknown(arg){seen.push(arg);return false;}}),{_:['tail']});
  assert.deepEqual(seen,['--x=1','-ab','-ab']);
  const error=new Error('stop');assert.throws(()=>parse(['--x'],{unknown(){throw error;}}),e=>e===error);
});
test('stopEarly appends large tails without variadic calls or numeric conversion', () => {
  const args=['first',...Array(150000).fill('123')];const result=parse(args,{stopEarly:true});
  assert.equal(result._.length,args.length);assert.equal(result._[1],'123');
});
test('numeric and token boundaries preserve ordinary upstream behavior', () => {
  const values=['0','001','-0','+2','1.5','.3','1e5','0xFF','Infinity','NaN','1junk','', ' ', 'a\nb'];
  for(const value of values)for(const args of [['--x='+value],['--x',value],['-x',value],[value]])assert.deepEqual(parse(args),upstream(args));
  assert.equal(parse(['--x=1E3']).x,1000);
});
test('generated ordinary arguments agree with unchanged upstream', () => {
  let seed=23;function next(n){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;}
  const tokens=['--port=8080','--name','bob','-abc','--verbose','--no-quiet','-n5','tail','--x.y=3','--','--raw','---','-','1.5'];
  const configs=[{}, {string:['port','name']}, {boolean:['verbose','quiet']},{alias:{port:'p'},default:{name:'default'}},{stopEarly:true},{'--':true},{boolean:true}];
  for(let i=0;i<5000;i++){
    const args=Array.from({length:next(12)},()=>tokens[next(tokens.length)]),options=configs[next(configs.length)];
    assert.deepEqual(parse(args,options),upstream(args,options),JSON.stringify({args,options}));
  }
});
test('deep paths use iteration and configuration arrays stay unmodified', () => {
  const key=Array(3000).fill('x').join('.');let result=parse(['--'+key+'=1']);
  for(let i=0;i<3000;i++)result=result.x;
  assert.equal(result,1);
  const options=Object.freeze({alias:Object.freeze({x:Object.freeze(['y'])}),string:Object.freeze(['x'])});
  assert.equal(parse(['--y','01'],options).x,'01');
});
test('CJS and ESM share the same frozen entry point', async () => {
  assert.equal((await import('../index.js')).default,parse);assert.ok(Object.isFrozen(parse));
});
test('comparison source and all upstream tests retain verified hashes', () => {
  const provenance=require('../PROVENANCE.json');
  for(const [file,hash]of Object.entries(provenance.sha256))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',file))).digest('hex'),hash,file);
});

test('inherited setters are never invoked when creating output properties', () => {
  let writes=0;
  Object.defineProperty(Object.prototype,'vpmSetter',{configurable:true,set(){writes++;}});
  try {
    const result=parse(['--vpmSetter=ok','--nested.vpmSetter=inside']);
    assert.equal(result.vpmSetter,'ok');assert.equal(result.nested.vpmSetter,'inside');assert.equal(writes,0);
  } finally { delete Object.prototype.vpmSetter; }
});
test('default and alias getters are captured once before unknown callbacks', () => {
  let defaultsRead=0,aliasesRead=0;const defaults={},aliases={};
  Object.defineProperty(defaults,'x',{enumerable:true,get(){defaultsRead++;return 'default';}});
  Object.defineProperty(aliases,'x',{enumerable:true,get(){aliasesRead++;return ['y'];}});
  const result=parse(['word'],{default:defaults,alias:aliases,unknown(){return false;}});
  assert.equal(defaultsRead,1);assert.equal(aliasesRead,1);assert.deepEqual(result,{_:[],x:'default',y:'default'});
});
test('long alias chains use iteration and each member receives one value', () => {
  const aliases={};for(let i=0;i<2000;i++)aliases['k'+i]='k'+(i+1);
  const result=parse(['--k1000=1','--k2000=2'],{alias:aliases});
  for(let i=0;i<=2000;i++)assert.deepEqual(result['k'+i],[1,2]);
});
