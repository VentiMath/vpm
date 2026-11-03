'use strict';
const assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
if(!process.argv.includes('--child')&&!process.argv.includes('--cycle')) {
  const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
  const provenance=require('../../packages/vradix-react-slot/PROVENANCE.json');
  const reference=path.resolve(path.dirname(require.resolve('@radix-ui/react-slot')),'..');
  assert.equal(require(path.join(reference,'package.json')).version,provenance.upstream.version);
  for(const [file,hash] of Object.entries(provenance.sourceSHA256))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(reference,file))).digest('hex'),hash,file);

  for(const variant of ['upstream','legacy','vpm']) {
    const r=spawnSync(process.execPath,[__filename,'--child',variant],{encoding:'utf8',timeout:30000});
    assert.equal(r.status,0,r.stdout+r.stderr);process.stdout.write(r.stdout);
  }
  const cycle=spawnSync(process.execPath,[__filename,'--cycle'],{encoding:'utf8',timeout:2000});
  assert.match(cycle.stdout,/cycle control entered/);
  assert.equal(cycle.error?.code,'ETIMEDOUT','Upstream cyclic lazy child control must demonstrate nontermination');
} else if(process.argv.includes('--child')) {
  const variant=process.argv.at(-1),api=require('./load.cjs')(variant),React=require('react'),{renderToStaticMarkup:ssr}=require('react-dom/server');
  const h=React.createElement;let groups=0,props;
  function check(fn){fn();groups++;}
  function Target(p){props=p;return h('button',null,p.children)}
  check(()=>{assert.equal(api.Root,api.Slot);assert.equal(api.Slot.displayName,'Slot.Slot');assert.equal(api.createSlot('Button').displayName,'Button.Slot');assert.equal(api.createSlottable('Button').displayName,'Button.Slottable');});
  check(()=>{assert.equal(ssr(h(api.Slot,{id:'outer',className:'parent',style:{color:'red',padding:2}},h('button',{id:'inner',className:'child',style:{color:'blue'}},'Text'))),'<button id="inner" class="parent child" style="color:blue;padding:2px">Text</button>');});
  check(()=>{const parentStyle=Object.freeze({padding:2,color:'red'}),childStyle=Object.freeze({color:'blue'});ssr(h(api.Slot,{style:parentStyle},h(Target,{style:childStyle})));assert.deepEqual(props.style,{padding:2,color:'blue'});assert.notEqual(props.style,parentStyle);assert.notEqual(props.style,childStyle);});
  check(()=>{for(const parent of [undefined,null,()=>17])for(const child of [undefined,null,()=>23]) {
    ssr(h(api.Slot,{onClick:parent},h(Target,{onClick:child})));
    if(parent&&child)assert.equal(props.onClick(),23);
    else assert.equal(props.onClick,parent||child);
  }});
  check(()=>{const calls=[],returned={},event={defaultPrevented:false,preventDefault(){this.defaultPrevented=true}};
    ssr(h(api.Slot,{onClick(...args){calls.push(['parent',this,args])}},h(Target,{onClick(...args){calls.push(['child',this,args]);args[0].preventDefault();return returned}})));
    const fn=props.onClick;assert.equal(fn(event,7),returned);
    assert.deepEqual(calls.map(x=>x[0]),['child','parent']);assert(calls.every(x=>x[1]===undefined));assert(calls.every(x=>x[2][0]===event&&x[2][1]===7));assert(event.defaultPrevented);
  });
  check(()=>{const error=Error('child'),events=[];ssr(h(api.Slot,{onClick(){events.push('outer')}},h(Target,{onClick(){throw error}})));assert.throws(props.onClick,e=>e===error);assert.deepEqual(events,[]);});
  check(()=>{for(const key of ['onclick','onX','on','onÅ','onMouseDown']) {
    const outer=()=>1,inner=()=>2;ssr(h(api.Slot,{[key]:outer},h(Target,{[key]:inner})));
    if(/^on[A-Z]/.test(key)){assert.notEqual(props[key],inner);assert.equal(props[key](),2);}else assert.equal(props[key],inner);
  }});
  check(()=>{for(const parent of [undefined,'','outer'])for(const child of [undefined,'','inner']){
    ssr(h(api.Slot,{className:parent},h(Target,{className:child})));assert.equal(props.className,[parent,child].filter(Boolean).join(' '));
  }});
  check(()=>{for(let bits=0;bits<64;bits++){
    const outer={},inner={};for(let i=0;i<6;i++){outer['data-'+i]='outer';if(bits>>i&1)inner['data-'+i]='inner';}
    ssr(h(api.Slot,outer,h(Target,inner)));for(let i=0;i<6;i++)assert.equal(props['data-'+i],bits>>i&1?'inner':'outer');
  }});
  check(()=>{assert.equal(ssr(h(api.Slot,{className:'slot'},h('i',{key:'left'},'L'),h(api.Slottable,{key:'target'},h('button',null,'B')),h('i',{key:'right'},'R'))),'<button class="slot"><i>L</i>B<i>R</i></button>');});
  check(()=>{const Foreign=require('./load.cjs')(variant==='vpm'?'upstream':'vpm').Slottable;assert.equal(ssr(h(api.Slot,{id:'interop'},h(Foreign,null,h('button',null,'child')))),variant==='legacy'?'<button>child</button>':'<button id="interop">child</button>');});
  check(()=>{for(const child of [null,undefined,false,''])assert.equal(ssr(h(api.Slot,null,child)),'');});
  check(()=>{assert.equal(ssr(h(api.Slot,null,h(React.Fragment,null,h('span',null,'fragment')))),'<span>fragment</span>');});
  check(()=>{assert.equal(ssr(h(api.Slottable,null,h('span',null,'standalone'))),'<span>standalone</span>');});
  if(variant!=='legacy') {
    check(()=>{for(const child of [0,1,'text',[],[h('div')],[h('div',{key:1}),h('div',{key:2})]])assert.throws(()=>ssr(h(api.createSlot('Named'),null,child)),/Named failed to slot/);});
    check(()=>{for(const child of [null,'text',0,[h('div',{key:1}),h('div',{key:2})]])assert.throws(()=>ssr(h(api.Slot,null,h(api.Slottable,null,child))),/failed to slot onto its `Slottable`/);});
    check(()=>{const warnings=[],original=console.error;console.error=(...args)=>warnings.push(args);
      try{assert.equal(ssr(h(api.Slot,{id:'outer'},h('i',{key:'l'},'L'),h(api.Slottable,{key:'s',child:h('button',null,'B')},content=>h('strong',null,content)),h('i',{key:'r'},'R'))),'<button id="outer"><i>L</i><strong>B</strong><i>R</i></button>');}finally{console.error=original;}
      assert.deepEqual(warnings,[],'Render-function children retain React single-child validation');
    });
    check(()=>{assert.equal(ssr(h(api.Slottable,{child:'raw'},child=>h('strong',null,child))),'<strong>raw</strong>');});
    check(()=>{for(const child of [' a\t b b ',undefined,''])for(const parent of ['b c',undefined,'']){
      ssr(h(api.Slot,{'aria-describedby':parent},h(Target,{'aria-describedby':child})));
      assert.equal(props['aria-describedby'],[...new Set([child,parent].filter(x=>typeof x==='string').join(' ').trim().split(/\s+/).filter(Boolean))].join(' ')||undefined);
    }});
    check(()=>{const element=h('button',null,'lazy'),lazy={$$typeof:Symbol.for('react.lazy'),_payload:{then(){},status:'fulfilled',value:element}};
      assert.equal(ssr(h(api.Slot,{id:'outer'},lazy)),'<button id="outer">lazy</button>');
      assert.equal(ssr(h(api.Slot,{id:'marker'},h(api.Slottable,null,lazy))),'<button id="marker">lazy</button>');
    });
    check(()=>{const children=[h(api.Slottable,{key:1},h('button',null,'first')),h(api.Slottable,{key:2},h('a',null,'last'))];
      if(variant==='vpm')assert.throws(()=>ssr(h(api.Slot,null,children)),/multiple Slottable targets/);
      else assert.equal(ssr(h(api.Slot,null,children)),'<a>firstlast</a>');
    });
  }
  if(variant==='vpm')check(()=>{const cycle={$$typeof:Symbol.for('react.lazy')};cycle._payload={then(){},status:'fulfilled',value:cycle};assert.throws(()=>ssr(h(api.Slot,null,cycle)),/cyclic lazy child/);});
  console.log(`${variant}: ${groups} contract groups, including 64 generated prop combinations, pass.`);
}
if(process.argv.includes('--cycle')) {
  const React=require('react'),api=require('./load.cjs')('upstream'),{renderToStaticMarkup}=require('react-dom/server');
  const cycle={$$typeof:Symbol.for('react.lazy')};cycle._payload={then(){},status:'fulfilled',value:cycle};process.stdout.write('cycle control entered\n');renderToStaticMarkup(React.createElement(api.Slot,null,cycle));
}
