'use strict';
// Shared checks for local archives and the exact publicly installed release.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=function checkReact(cwd,run){
 for(const runtime of ['node','bun'])console.log(run(runtime,[path.join(__dirname,'react.cjs')],cwd,{VPM_VLX_CONSUMER:cwd}).trim());
 fs.writeFileSync(path.join(cwd,'react-types.tsx'),`import {InlineMath,DisplayMath,MathText,preloadMath,MathProvider} from 'vlx/react';const a=<InlineMath tex="x" style={{'--vlx-scale':1.2}}/>;const b=<DisplayMath tex="x" fallback={(error,raw)=><span>{error.code+raw}</span>}/>;const c=<MathText source="$x$"/>;const p:Promise<void>=preloadMath();const provider=<MathProvider scrollLabel="Formula" loadingFallback={null}>{a}</MathProvider>;\n// @ts-expect-error tex is required\nconst bad=<InlineMath/>;`);
 for(const mode of ['NodeNext','Bundler']){
  fs.writeFileSync(path.join(cwd,'tsconfig-react.json'),JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',module:mode==='Bundler'?'ESNext':mode,moduleResolution:mode,jsx:'react-jsx',lib:['ES2022','DOM'],types:[]},files:['react-types.tsx']}));
  run('node',[require('../platform-types.cjs').compiler().path,'-p','tsconfig-react.json'],cwd);
 }
 fs.writeFileSync(path.join(cwd,'react-browser.js'),`import React from 'react';import {createRoot} from 'react-dom/client';import {MathText,DisplayMath} from 'vlx/react';const root=createRoot(document.getElementById('root'));window.mountMath=()=>root.render(React.createElement(DisplayMath,{tex:'x^2+1'}));window.unmountMath=()=>root.unmount();root.render(React.createElement(MathText,{source:'Plain prose'}));window.ready=true;`);
 run('bun',['build','react-browser.js','--target=browser','--splitting','--minify','--metafile=react-meta.json','--outdir=react-dist'],cwd);
 const meta=JSON.parse(fs.readFileSync(path.join(cwd,'react-meta.json'))),entries=Object.entries(meta.outputs),entry=entries.find(([,o])=>o.entryPoint?.endsWith('react-browser.js'));
 assert(entry,'React browser entry');const eager=new Set();
 function walk(name){if(eager.has(name))return;eager.add(name);const o=meta.outputs[name];assert(o,'Known output '+name);for(const i of o.imports||[])if(i.kind!=='dynamic-import'&&!i.external)walk(i.path);}
 walk(entry[0]);
 const glyph=entries.filter(([,o])=>Object.keys(o.inputs||{}).some(p=>p.endsWith('/font/glyphs.json'))).map(([p])=>p);
 assert(glyph.length,'Glyph chunk exists');for(const p of glyph)assert(!eager.has(p),'Glyphs must be outside the eager chunk graph');
 assert(!Object.keys(meta.inputs).some(p=>/vpngjs|resvg|katex|mathjax/.test(p)),'Browser bundle excludes Node image and upstream engines');
 fs.writeFileSync(path.join(cwd,'react-chunks.json'),JSON.stringify({entry:path.basename(entry[0]),glyph:glyph.map(p=>path.basename(p))}));
 console.log('React TS7 NodeNext/Bundler and deferred browser chunk graph pass.');
};
