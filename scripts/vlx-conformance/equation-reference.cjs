'use strict';
// Keep reference workers independent of the VPM implementation being measured.
const escape=value=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
let ready;
async function controls(){
 if(!ready)ready=(async()=>{
  require('@mathjax/src/js/util/asyncLoad/node.js');
  const {mathjax}=require('@mathjax/src/js/mathjax.js'),{TeX}=require('@mathjax/src/js/input/tex.js'),{SVG}=require('@mathjax/src/js/output/svg.js'),{MathJaxNewcmFont}=require('@mathjax/mathjax-newcm-font/js/svg.js'),{liteAdaptor}=require('@mathjax/src/js/adaptors/liteAdaptor.js'),{RegisterHTMLHandler}=require('@mathjax/src/js/handlers/html.js');
  for(const [name,file]of [['base','Base'],['ams','Ams'],['newcommand','Newcommand'],['textmacros','TextMacros']])require('@mathjax/src/js/input/tex/'+name+'/'+file+'Configuration.js');
  const adaptor=liteAdaptor();RegisterHTMLHandler(adaptor);return {mathjax,TeX,SVG,MathJaxNewcmFont,adaptor};
 })();return ready;
}
exports.factory=async(numbering='ams')=>{
 const {mathjax,TeX,SVG,MathJaxNewcmFont,adaptor}=await controls();
 const input=new TeX({packages:['base','ams','newcommand','textmacros'],tags:numbering,formatError(_jax,e){throw e;}}),output=new SVG({fontData:MathJaxNewcmFont,fontCache:'local',useXlink:false});
 await output.font.loadDynamicFiles();
 return async source=>{
  input.reset();const doc=mathjax.document('<div>'+escape(source)+'</div>',{InputJax:input,OutputJax:output});
  try{await doc.renderPromise();const labels=Object.fromEntries(Object.entries(input.parseOptions.tags.allLabels).map(([key,value])=>[key,value.tag]));return {html:adaptor.outerHTML(adaptor.body(doc.document)),labels};}finally{doc.clear();}
 };
};
