'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{default:convert,getStylesForProperty,getPropertyName,transformRawValue}=require(process.env.VCSS_NATIVE_ENTRY||'..');
test('owned helpers handle colors, names and function syntax together',()=>{
 assert.deepEqual(convert([['border','2px solid cyan'],['box-shadow','1px 2px magenta'],['transform','translate(2px, 3px) rotate(15deg)']]),{borderWidth:2,borderStyle:'solid',borderColor:'cyan',shadowOffset:{width:1,height:2},shadowRadius:0,shadowColor:'magenta',shadowOpacity:1,transform:[{rotate:'15deg'},{translateY:3},{translateX:2}]});
});
test('prototype names remain own data and inherited color names are rejected',()=>{
 const r=convert([['__proto__','red'],['constructor','blue'],['--custom-key','0%']]);assert.equal(Object.getPrototypeOf(r),Object.prototype);assert.equal(r.constructor,'blue');assert.equal(r['--custom-key'],'0%');assert.throws(()=>convert([['border','1px solid constructor']]));assert.equal({}.polluted,undefined);
});
test('ordered declarations, blacklist, independent results',()=>{
 assert.deepEqual(convert([['margin','1px'],['margin-left','2px']]),{marginTop:1,marginRight:1,marginBottom:1,marginLeft:2});assert.deepEqual(convert([['margin','1px']],['margin']),{margin:1});const a=convert([['transform','scale(2)']]);a.transform[0].scale=99;assert.equal(convert([['transform','scale(2)']]).transform[0].scale,2);assert.equal(getPropertyName('--custom-key'),'--custom-key');assert.deepEqual(getStylesForProperty('padding','1px',false),{padding:1});
});
test('malformed functions and incomplete shorthands fail with declaration context',()=>{
 for(const [name,value] of [['transform','rotate(2deg'],['font','12px'],['padding','1'],['border','red blue'],['background','rgb(1,2,3']])assert.throws(()=>convert([[name,value]]),/Failed to parse declaration/);
});
test('ESM default and named exports agree with Babel-compatible CommonJS',async()=>{
 const path=require('node:path'),{pathToFileURL}=require('node:url');
 const root=process.env.VCSS_NATIVE_ENTRY?path.dirname(require.resolve(process.env.VCSS_NATIVE_ENTRY)):path.resolve(__dirname,'..');
 const esm=await import(pathToFileURL(path.join(root,'index.mjs')).href);
 assert.equal(esm.default,convert);assert.equal(esm.getPropertyName,getPropertyName);assert.equal(esm.getStylesForProperty,getStylesForProperty);assert.equal(esm.transformRawValue,transformRawValue);
});

test('all baseline color functions survive every color-bearing shorthand',()=>{
 for(const value of ['hwb(90 10% 20%)','lab(50% 20 30 / .5)','lch(50% 40 30)','gray(50% / .5)','color(display-p3 1 0 .5)','color(display-p3 var(--red, 1) 0 0)','HWB(90 10% 20%)']){
  const pairs=[['background',value,'backgroundColor'],['border','1px solid '+value,'borderColor'],['border-color',value,'borderTopColor'],['box-shadow','1px 2px 3px '+value,'shadowColor'],['text-shadow',value+' 1px 2px','textShadowColor'],['text-decoration','underline '+value,'textDecorationColor']];
  for(const [name,input,key]of pairs)assert.equal(convert([[name,input]])[key],value);
 }
 assert.deepEqual(convert([['border-color','hwb(90 10% 20%) lab(50% 20 30)']]),{borderTopColor:'hwb(90 10% 20%)',borderRightColor:'lab(50% 20 30)',borderBottomColor:'hwb(90 10% 20%)',borderLeftColor:'lab(50% 20 30)'});
});
test('expanded color support keeps unclosed functions and trailing tokens invalid',()=>{
 for(const name of ['hwb','lab','lch','gray','color'])for(const [prop,value]of [['background',name+'(1 2 3'],['border','1px solid '+name+'(1 2 3'],['background',name+'(1 2 3) garbage']])assert.throws(()=>convert([[prop,value]]),/Failed to parse declaration/);
 assert.throws(()=>convert([['background','constructor(1)']]));
});
test('raw values convert independently without trimming or expanding shorthands',()=>{
 assert.equal(transformRawValue('width','2px'),2);assert.equal(transformRawValue('width',' 2px '),' 2px ');
 assert.equal(transformRawValue('flag','TRUE'),true);assert.equal(transformRawValue('value','null'),null);assert.equal(transformRawValue('value','undefined'),undefined);
 assert.equal(transformRawValue('margin','2px 4px'),'2px 4px');assert.equal(transformRawValue('width','2em'),'2em');
 assert.equal(transformRawValue('value','2.'),'2.');assert.equal(transformRawValue('value','1.e3'),'1.e3');assert.equal(transformRawValue('width','2.px'),'2.px');
 assert.equal(transformRawValue('width','-.5PX'),-.5);assert.equal(transformRawValue('value','1e3'),1000);
 assert.equal(convert([['custom','2.']]).custom,'2.');
});
