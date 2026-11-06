'use strict';
const {parseMath}=require('./tex.cjs'),layouts=require('./layout.cjs');
const {VlxError}=require('./source.cjs');
function normalized(options){
 const display=options.display??false,fontSize=options.fontSize??undefined;
 if(fontSize!==undefined&&(!Number.isFinite(fontSize)||fontSize<=0||fontSize>256))throw new RangeError('fontSize must be positive and at most 256');
 if(typeof display!=='boolean')throw new TypeError('display must be boolean');
 return {display,fontSize};
}
const hidden=Object.freeze({position:'absolute',left:0,top:0,width:'1px',height:'1px',padding:0,border:0,overflow:'hidden',clipPath:'inset(50%)',whiteSpace:'nowrap',userSelect:'none'});
const webStyles=[Object.freeze({display:'block',maxWidth:'none'}),Object.freeze({display:'block',margin:'var(--vlx-display-margin,0 auto)',maxWidth:'none'})];
function output(layout,{element:E,text:T,group:G}){return function render(tex,options={},ast){
 const checked=normalized(options),fontSize=checked.fontSize??16,display=checked.display;
 const b=layout(ast??parseMath(tex),{display}),pad=.08,w=b.w+pad*2,h=b.h+b.d+pad*2;
 if(!Number.isFinite(w)||!Number.isFinite(h)||w>4096||h>4096||w<=0||h<=0)throw new VlxError('LIMIT','Layout exceeds the supported bounds');
 const round=x=>Number(x.toFixed(5)),width=round(w*fontSize),height=round(h*fontSize),baseline=round((b.h+pad)*fontSize);
 const inner=G(`translate(${pad} ${round(b.h+pad)})`,b.svg);
 const attrs={xmlns:'http://www.w3.org/2000/svg',viewBox:`0 0 ${round(w)} ${round(h)}`};
 const svg=E('svg',{...attrs,width,height},E('title',null,T(tex)),E('g',{color:'black'},inner));
 const mathml=E('math',{xmlns:'http://www.w3.org/1998/Math/MathML',display:display?'block':'inline'},E('semantics',null,b.mml,E('annotation',{encoding:'application/x-tex'},T(tex))));
 const webSvg=E('svg',{...attrs,width:round(w)+'em',height:round(h)+'em',style:webStyles[Number(display)],...(ast?.hasReferences?{role:'presentation'}:{'aria-hidden':'true',focusable:'false'})},inner);
 const html=E('span',{className:'vlx-math','data-vlx':'math','data-vlx-display':String(display),style:{position:'relative',maxWidth:'100%',minWidth:0,display:display?'block':'inline-block',overflowX:'auto',...(!display?{verticalAlign:round(-(b.d+pad))+'em'}:{}),fontSize:`calc(var(--vlx-scale,1) * ${checked.fontSize===undefined?'1em':fontSize+'px'})`}},webSvg,E('span',{style:hidden},mathml));
 return {tex,display,svg,html,mathml,width,height,baseline};
}
}
exports.normalized=normalized;
exports.renderNodes=output(layouts.layoutNodes,require('./nodes.cjs'));
exports.renderStrings=output(layouts.layout,require('./markup.cjs'));
