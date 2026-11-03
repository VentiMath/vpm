'use strict';
// Unmodified current engines are test controls only. Never packed with VLX.
exports.katex=(tex,display=true)=>require('katex').renderToString(tex,{displayMode:display,output:'htmlAndMathml',throwOnError:true,trust:false,macros:{'\\overarc':'\\overgroup{#1}','\\arc':'\\overgroup{#1}','\\intersect':'\\cap'}});
let context;
exports.mathjax=async(tex,display=true)=>{
 if(!context){
  require('@mathjax/src/js/util/asyncLoad/node.js');
  const {mathjax}=require('@mathjax/src/js/mathjax.js'),{TeX}=require('@mathjax/src/js/input/tex.js'),{SVG}=require('@mathjax/src/js/output/svg.js'),{MathJaxNewcmFont}=require('@mathjax/mathjax-newcm-font/js/svg.js'),{liteAdaptor}=require('@mathjax/src/js/adaptors/liteAdaptor.js'),{RegisterHTMLHandler}=require('@mathjax/src/js/handlers/html.js'),{SerializedMmlVisitor}=require('@mathjax/src/js/core/MmlTree/SerializedMmlVisitor.js');
  for(const [name,file] of [['base','Base'],['ams','Ams'],['newcommand','Newcommand'],['configmacros','ConfigMacros'],['textmacros','TextMacros'],['color','Color'],['enclose','Enclose']])require('@mathjax/src/js/input/tex/'+name+'/'+file+'Configuration.js');
  const adaptor=liteAdaptor();RegisterHTMLHandler(adaptor);context={mathjax,TeX,SVG,MathJaxNewcmFont,adaptor,SerializedMmlVisitor};
 }
 const {mathjax,TeX,SVG,MathJaxNewcmFont,adaptor,SerializedMmlVisitor}=context;
 const input=new TeX({packages:['base','ams','newcommand','configmacros','textmacros','color','enclose'],macros:{overarc:['\\overparen{#1}',1]},formatError(_jax,error){throw error}}),output=new SVG({fontData:MathJaxNewcmFont,fontCache:'local',useXlink:false}),doc=mathjax.document('',{InputJax:input,OutputJax:output});
 try{await output.font.loadDynamicFiles();const node=await doc.convertPromise(tex,{display,em:16,ex:8,containerWidth:888});const svg=adaptor.tags(node,'svg')[0];const styles=adaptor.cssText(output.styleSheet(doc));return {svg:adaptor.outerHTML(svg).replace(/(<svg[^>]*>)/,'$1<style>'+styles+'</style>'),mathml:new SerializedMmlVisitor().visitTree(input.mathNode)};}finally{doc.clear()}
};
// Benchmark a ready renderer, not repeated engine construction. Cases contain
// no macro definitions; clear equation counters between conversions.
exports.svgFactory=async()=>{
 await exports.mathjax('x');const {mathjax,TeX,SVG,MathJaxNewcmFont,adaptor}=context;
 const input=new TeX({packages:['base','ams','newcommand','configmacros','textmacros','color','enclose'],formatError(_jax,error){throw error}}),output=new SVG({fontData:MathJaxNewcmFont,fontCache:'local',useXlink:false}),doc=mathjax.document('',{InputJax:input,OutputJax:output});
 await output.font.loadDynamicFiles();
 return async tex=>{input.reset();const node=await doc.convertPromise(tex,{display:true,em:16,ex:8,containerWidth:888});return adaptor.outerHTML(adaptor.tags(node,'svg')[0]);};
};
