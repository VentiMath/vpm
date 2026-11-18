'use strict';
// Native view/rendering is a test boundary. styled-components and the converter
// are real unchanged packages; this is not a claim that VentiMath uses RN.
const assert=require('node:assert/strict'),{createRequire}=require('node:module'),Module=require('node:module'),path=require('node:path');
const peer=createRequire(path.resolve(process.argv[2]||__dirname,'package.json')),R=peer('react'),ssr=peer('react-dom/server');
const control=require('css-to-react-native').default;
const original=Module._load;let captured,lastArgs,reads=0;
if(process.versions.bun){
 const {mock}=require('bun:test'),actual=process.env.VCSS_NATIVE_ENTRY?require(process.env.VCSS_NATIVE_ENTRY):peer('css-to-react-native');
 mock.module('react-native',()=>({View:p=>{captured=p.style;return R.createElement('div')},StyleSheet:{create:s=>s}}));
 mock.module(peer.resolve('css-to-react-native'),()=>({...actual,__esModule:true,default(...args){reads++;lastArgs=args;return actual.default(...args)}}));
}
Module._load=function(id,parent,isMain){
 if(id==='react-native')return {View:p=>{captured=p.style;return R.createElement('div')},StyleSheet:{create:s=>s}};
 if(id==='css-to-react-native'&&parent?.filename.includes('styled-components')){
  const actual=process.env.VCSS_NATIVE_ENTRY?require(process.env.VCSS_NATIVE_ENTRY):original.apply(this,arguments);
  return Object.defineProperty({...actual,default(...args){reads++;lastArgs=args;return actual.default(...args)}},'__esModule',{value:true});
 }
 return original.apply(this,arguments);
};
try{
 const styled=peer('styled-components/native').default;
 const cases=[['margin: 4px 8px; border: 1px solid red;', {marginTop:4,marginRight:8,marginBottom:4,marginLeft:8,borderWidth:1,borderColor:'red',borderStyle:'solid'}],
 ['font: bold 16px/20px "Arial"; transform: translate(2px, 3px) scale(2);', {fontStyle:'normal',fontWeight:'bold',fontVariant:[],fontFamily:'Arial',fontSize:16,lineHeight:20,transform:[{scale:2},{translateY:3},{translateX:2}]}],
 ['flex: 1 0 auto; padding: 0 2px;', {flexGrow:1,flexShrink:0,flexBasis:'auto',paddingTop:0,paddingRight:2,paddingBottom:0,paddingLeft:2}]];
 for(const value of ['hwb(90 10% 20%)','lab(50% 20 30 / .5)','lch(50% 40 30)','gray(50% / .5)','color(display-p3 1 0 .5)'])for(const [property,input]of [['background',value],['border','1px solid '+value],['border-color',value+' red'],['box-shadow','1px 2px 3px '+value],['text-shadow',value+' 1px 2px'],['text-decoration','underline '+value]])cases.push([property+': '+input+';',null]);
 for(const [css,expected]of cases){const C=styled.View([css]);ssr.renderToStaticMarkup(R.createElement(C));assert.deepEqual(captured,expected||control(...lastArgs));}
 assert.equal(reads,cases.length);console.log(`Unchanged styled-components 6.1.17 native caller: ${cases.length} styles, ${reads} verified converter calls`);
}finally{Module._load=original;}
