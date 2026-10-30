'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const u=await import('./node_modules/@nodable/entities/src/index.js'),v=require('../../packages/vnodable-entities');
 const cases=[
  ['trailing decimal junk',lib=>new lib.EntityDecoder().decode('&#65junk;'),'A','&#65junk;'],
  ['trailing hex junk',lib=>new lib.EntityDecoder().decode('&#x41z;'),'A','&#x41z;'],
  ['long leading zeros',lib=>new lib.EntityDecoder().decode('&#'+'0'.repeat(40)+'65;'),'&#'+'0'.repeat(40)+'65;','A'],
  ['long registered name',lib=>{const d=new lib.EntityDecoder();d.addExternalEntity('x'.repeat(40),'X');return d.decode('&'+'x'.repeat(40)+';');},'&'+'x'.repeat(40)+';','X'],
  ['nested ampersand in numeric token',lib=>new lib.EntityDecoder().decode('&#65&lt;'),'A','&#65<'],
  ['XML noncharacter',lib=>new lib.EntityDecoder().decode('&#65534;'),'\ufffe',''],
  ['reset XML version',lib=>{const d=new lib.EntityDecoder();d.setXmlVersion(1.1);d.reset();return d.decode('&#1;');},'\x01',''],
  ['single external ampersand value',lib=>{const d=new lib.EntityDecoder();d.addExternalEntity('x','a&b');return d.decode('&x;');},'&x;','a&b'],
  ['failed registration budget reset',lib=>{let reject=false;const d=new lib.EntityDecoder({limit:{maxTotalExpansions:1},onInputEntity:()=>reject?'throw':'allow'});d.addInputEntities({x:'X'});d.decode('&x;');reject=true;try{d.addInputEntities({y:'Y'});}catch{}try{d.decode('&x;');return 'allowed';}catch{return 'limited';}},'allowed','limited'],
  ['unknown hook decision',lib=>{const d=new lib.EntityDecoder({onInputEntity:()=>undefined});try{d.addInputEntities({x:'X'});return 'allowed';}catch{return 'rejected';}},'allowed','rejected'],
  ['entity-free postCheck',lib=>new lib.EntityDecoder({postCheck:s=>s+'!'}).decode('plain'),'plain','plain!'],
  ['postCheck string contract',lib=>{try{return typeof new lib.EntityDecoder({postCheck:()=>42}).decode('&lt;');}catch{return 'rejected';}},'number','rejected'],
  ['ASCII custom encoding',lib=>new lib.EntityEncoder({namedEntities:{x:'ab'}}).encode('ab'),'ab','&x;'],
  ['long custom encoding',lib=>new lib.EntityEncoder({namedEntities:{x:'雪雪雪雪'}}).encode('雪雪雪雪'),'雪雪雪雪','&x;'],
  ['inherited encoding entries',lib=>new lib.EntityEncoder({namedEntities:Object.create({x:'©'})}).encode('©'),'&x;','©'],
 ];
 for(const key of ['ocirc','boxDl','boxdL','af'])cases.push([key,lib=>lib.ALL_ENTITIES[key],u.ALL_ENTITIES[key],{ocirc:'ô',boxDl:'╖',boxdL:'╕',af:'\u2061'}[key]]);
 for(const [name,run,before,after]of cases){assert.equal(run(u),before,name+' upstream');assert.equal(run(v),after,name+' VPM');}
 console.log(`${cases.length} upstream/VPM entity discriminators passed.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
