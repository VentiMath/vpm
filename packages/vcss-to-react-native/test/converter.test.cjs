'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{default:convert,getStylesForProperty,getPropertyName}=require(process.env.VCSS_NATIVE_ENTRY||'..');
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
 assert.equal(esm.default,convert);assert.equal(esm.getPropertyName,getPropertyName);assert.equal(esm.getStylesForProperty,getStylesForProperty);
});
