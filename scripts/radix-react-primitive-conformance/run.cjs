'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
if(!process.argv.includes('--child')) {
  const provenance=require('../../packages/vradix-react-primitive/PROVENANCE.json'),directory=path.resolve(path.dirname(require.resolve('@radix-ui/react-primitive')),'..');
  assert.equal(require(path.join(directory,'package.json')).version,provenance.upstream.version);
  for(const [file,hash] of Object.entries(provenance.sourceSHA256))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(directory,file))).digest('hex'),hash,file);
  for(const variant of ['upstream','legacy','vpm']){const r=spawnSync(process.execPath,[__filename,'--child',variant],{encoding:'utf8',timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);process.stdout.write(r.stdout);}
} else {
  const variant=process.argv.at(-1),load=require('./load.cjs'),React=require('react'),{renderToStaticMarkup:ssr}=require('react-dom/server'),h=React.createElement;
  const api=load(variant),tags=['a','button','div','form','h2','h3','img','input','label','li','nav','ol','p','select','span','svg','ul'];
  assert.deepEqual(Object.keys(api).sort(),['Primitive','Root','dispatchDiscreteCustomEvent']);assert.equal(api.Root,api.Primitive);assert.deepEqual(Object.keys(api.Primitive),tags);
  let cases=0;
  for(const tag of tags) {
    const props={id:tag,className:'base','data-owner':'fixture','aria-label':tag};
    if(tag==='button')Object.assign(props,{type:'button',disabled:true});
    if(tag==='a')props.href='#target';if(tag==='label')props.htmlFor='field';if(tag==='svg')props.viewBox='0 0 10 10';
    const children=['img','input'].includes(tag)?undefined:tag==='select'?h('option',{value:'one'},'One'):tag==='svg'?h('path',{d:'M0 0L1 1'}):'Text';
    Object.freeze(props);
    assert.equal(api.Primitive[tag].displayName,'Primitive.'+tag);
    assert.equal(ssr(h(api.Primitive[tag],props,children)),ssr(h(tag,props,children)));
    for(const asChild of [false,undefined])assert.equal(ssr(h(api.Primitive[tag],{...props,asChild},children)),ssr(h(tag,props,children)));
    assert.equal(ssr(h(api.Primitive[tag],{asChild:true,className:'outer','data-tag':tag},h('button',{className:'inner'},'Slot'))),`<button class="outer inner" data-tag="${tag}">Slot</button>`);
    cases++;
  }
  assert.equal(typeof globalThis.window,'undefined');
  const imports=[],created=[],slot=load.slot(variant),name=variant==='vpm'?'vradix-react-slot':'@radix-ui/react-slot';
  const fresh=load.factory(variant,id=>{imports.push(id)},{[name]:{...slot,createSlot(owner){created.push(owner);return slot.createSlot(owner)}}})();
  assert.equal(created.length,variant==='vpm'?0:17);
  assert.equal(imports.includes('react-dom'),variant!=='vpm');
  fresh.dispatchDiscreteCustomEvent(null,null);assert.equal(imports.includes('react-dom'),variant!=='vpm');
  ssr(h(fresh.Primitive.button,null,'plain'));assert.equal(created.length,variant==='vpm'?0:17);
  const child=()=>h(fresh.Primitive.button,{asChild:true},h('button',null,'slot'));
  ssr(child());ssr(child());assert.equal(created.filter(x=>x==='Primitive.button').length,1);
  ssr(h(fresh.Primitive.a,{asChild:true},h('a',{href:'#other'},'other')));assert.equal(created.length,variant==='vpm'?2:17);
  if(variant!=='legacy')assert.throws(()=>ssr(h(fresh.Primitive.button,{asChild:true},'text')),/Primitive.button failed to slot/);
  const event={},seen=[],target={dispatchEvent(value){seen.push([this,value]);return false}};
  assert.equal(fresh.dispatchDiscreteCustomEvent(target,event),undefined);assert.deepEqual(seen,[[target,event]]);assert(imports.includes('react-dom'));
  const error={message:'dispatch'};assert.throws(()=>fresh.dispatchDiscreteCustomEvent({dispatchEvent(){throw error}},event),e=>e===error);
  console.log(`${variant}: ${cases} tag/ref-prop shapes, asChild output, aliases, named factories, lazy-init controls and dispatch contracts pass.`);
}
