'use strict';
const glyphs=require('./font/glyphs.json');
const {VlxError,escape}=require('./source.cjs');
const n=x=>Number(x.toFixed(5));
const move=(b,x=0,y=0,scale=1)=>`<g transform="translate(${n(x)} ${n(y)}) scale(${n(scale)})">${b.svg}</g>`;
const box=(w,h,d,svg,mml)=>({w,h:Math.max(0,h),d:Math.max(0,d),svg,mml});
function glyph(char,font='normal'){
 const metric=glyphs[font]?.[char]||glyphs.normal[char];
 if(!metric)throw new VlxError('UNSUPPORTED_GLYPH','No outline for '+char);
 const [h,d,w,ic,path]=metric;
 return box(w+ic,h,d,path?`<path d="${path}" transform="scale(.001 -.001)" fill="currentColor"/>`:'','');
}
function text(value,font='normal'){
 let w=0,h=0,d=0,svg='';for(const char of value){const b=glyph(char,font);svg+=move(b,w);w+=b.w;h=Math.max(h,b.h);d=Math.max(d,b.d);}return box(w,h,d,svg,'');
}
function fence(char,body){
 if(char==='.')return box(0,0,0,'','');
 const height=Math.max(1,body.h+body.d+.16);let choice='normal';
 for(const font of ['normal','-size3','-size4']){choice=font;const m=glyphs[font]?.[char]||glyphs.normal[char];if(m&&m[0]+m[1]>=height)break;}
 const b=glyph(char,choice),scaleY=Math.max(1,height/(b.h+b.d)),mid=(body.d-body.h)/2;
 const y=mid+(b.h-b.d)*scaleY/2;
 return box(b.w,Math.max(0,b.h*scaleY-y),Math.max(0,b.d*scaleY+y),`<g transform="translate(0 ${n(y)}) scale(1 ${n(scaleY)})">${b.svg}</g>`,'');
}
function layout(ast,options={}){
 const display=!!options.display,font=options.font;
 const child=(a,extra={})=>layout(a,{display,font,...extra});
 switch(ast.kind){
  case 'symbol':{
   const style=font||((/^[a-zA-Zα-ωϕϵϑς]$/u.test(ast.text))?'italic':'normal');
   const b=glyph(ast.text,ast.large&&display?'-largeop':style);
   const identifier=ast.class==='ord'&&/^[\p{L}]$/u.test(ast.text);b.mml=`<${identifier?'mi':'mo'}>${escape(ast.text)}</${identifier?'mi':'mo'}>`;return b;
  }
  case 'number':{const b=text(ast.text,font||'normal');b.mml='<mn>'+escape(ast.text)+'</mn>';return b;}
  case 'text':{const b=text(ast.text,'normal');b.mml=ast.operator?'<mi mathvariant="normal">'+escape(ast.text)+'</mi>':'<mtext>'+escape(ast.text)+'</mtext>';return b;}
  case 'space':return box(ast.width,0,0,'',`<mspace width="${ast.width}em"/>`);
  case 'font':{
   let body=ast.body;
   if(ast.font==='mathbb'){
    const map={R:'ℝ',Z:'ℤ',N:'ℕ',Q:'ℚ',C:'ℂ'};
    function replace(node){if(node.kind==='row')return {...node,children:node.children.map(replace)};if(node.kind==='symbol'&&map[node.text])return {...node,text:map[node.text]};throw new VlxError('TEX','Blackboard bold currently supports R, Z, N, Q and C');}
    body=replace(body);
   }
   const b=child(body,{font:ast.font==='mathit'?'italic':ast.font==='mathbf'?'bold':'normal'});b.mml=`<mstyle mathvariant="${{mathit:'italic',mathbf:'bold',mathrm:'normal',mathbb:'double-struck'}[ast.font]}">${b.mml}</mstyle>`;return b;
  }
  case 'row':{
   const boxes=ast.children.map(a=>child(a));let w=0,h=0,d=0,svg='',mml='';
   const type=a=>a.kind==='scripts'?type(a.base):a.class||(a.operator?'op':'ord');
   const types=ast.children.map(type);for(let i=0;i<types.length;i++)if(types[i]==='bin'&&(!i||['bin','rel','open'].includes(types[i-1])||i===types.length-1||['rel','close','punct'].includes(types[i+1])))types[i]='ord';
   for(let i=0;i<boxes.length;i++){
    const b=boxes[i],left=types[i-1],right=types[i];let space=0;
    if(i&&left!=='open'&&right!=='close')space=left==='rel'||right==='rel'?.278:left==='bin'||right==='bin'?.222:left==='punct'||left==='op'||right==='op'?.167:0;
    w+=space;svg+=move(b,w);w+=b.w;h=Math.max(h,b.h);d=Math.max(d,b.d);mml+=b.mml;
   }
   return box(w,h,d,svg,'<mrow>'+mml+'</mrow>');
  }
  case 'fraction':{
   const full=ast.style==='dfrac'||(display&&ast.style!=='tfrac'),scale=full?1:.72;
   const a=child(ast.numerator,{display:false}),b=child(ast.denominator,{display:false});
   const w=Math.max(a.w,b.w)*scale+.24,axis=-.25,gap=full?.2:.13,t=.06;
   const y1=axis-gap-a.d*scale-t/2,y2=axis+gap+b.h*scale+t/2;
   return box(w,Math.max(-y1+a.h*scale,.3),y2+b.d*scale,move(a,(w-a.w*scale)/2,y1,scale)+move(b,(w-b.w*scale)/2,y2,scale)+`<rect x="0" y="${n(axis-t/2)}" width="${n(w)}" height="${t}" fill="currentColor"/>`,'<mfrac>'+a.mml+b.mml+'</mfrac>');
  }
  case 'scripts':{
   const base=child(ast.base),sup=ast.sup?child(ast.sup,{display:false}):null,sub=ast.sub?child(ast.sub,{display:false}):null,s=.7;
   if(display&&ast.base.limits){
    const w=Math.max(base.w,sup?sup.w*s:0,sub?sub.w*s:0),up=-(base.h+.18+(sup?sup.d*s:0)),down=base.d+.18+(sub?sub.h*s:0);
    return box(w,sup?-up+sup.h*s:base.h,sub?down+sub.d*s:base.d,move(base,(w-base.w)/2)+(sup?move(sup,(w-sup.w*s)/2,up,s):'')+(sub?move(sub,(w-sub.w*s)/2,down,s):''),`<${sup&&sub?'munderover':sup?'mover':'munder'}>${base.mml}${sub?sub.mml:''}${sup?sup.mml:''}</${sup&&sub?'munderover':sup?'mover':'munder'}>`);
   }
   const up=sup?-Math.max(.48,base.h-.15,sup.d*s+.32):0;let down=sub?Math.max(.25,base.d+.14,sub.h*s-.2):0;
   if(sup&&sub)down=Math.max(down,up+sup.d*s+.18+sub.h*s);
   const w=base.w+.04+Math.max(sup?sup.w*s:0,sub?sub.w*s:0),tag=sup&&sub?'msubsup':sup?'msup':'msub';
   return box(w,Math.max(base.h,sup?-up+sup.h*s:0),Math.max(base.d,sub?down+sub.d*s:0),base.svg+(sup?move(sup,base.w+.04,up,s):'')+(sub?move(sub,base.w+.04,down,s):''),`<${tag}>${base.mml}${sub?sub.mml:''}${sup?sup.mml:''}</${tag}>`);
  }
  case 'root':{
   const b=child(ast.body),idx=ast.index?child(ast.index,{display:false}):null,offset=idx?Math.max(.2,idx.w*.5):0,left=.75+offset,top=-b.h-.14,bottom=Math.max(b.d,.06),w=b.w+left+.1;
   const stroke=`<path d="M ${n(offset+.06)} ${n((bottom+top)*.25)} L ${n(offset+.23)} ${n((bottom+top)*.25-.1)} L ${n(offset+.4)} ${n(bottom)} L ${n(offset+.7)} ${n(top)} H ${n(w)}" fill="none" stroke="currentColor" stroke-width=".055" stroke-linejoin="round"/>`;
   return box(w,Math.max(-top+.03,idx?b.h*.5+idx.h*.5:0),bottom+.03,stroke+move(b,left)+(idx?move(idx,0,-b.h*.5,.5):''),idx?'<mroot>'+b.mml+idx.mml+'</mroot>':'<msqrt>'+b.mml+'</msqrt>');
  }
  case 'fenced':{
   const b=child(ast.body),left=fence(ast.left,b),right=fence(ast.right,b);return box(left.w+b.w+right.w,Math.max(b.h,left.h,right.h),Math.max(b.d,left.d,right.d),left.svg+move(b,left.w)+move(right,left.w+b.w),'<mrow><mo stretchy="true">'+escape(ast.left==='.'?'':ast.left)+'</mo>'+b.mml+'<mo stretchy="true">'+escape(ast.right==='.'?'':ast.right)+'</mo></mrow>');
  }
  case 'color':{const b=child(ast.body);b.svg=`<g color="${ast.color}">${b.svg}</g>`;b.mml=`<mstyle mathcolor="${ast.color}">${b.mml}</mstyle>`;return b;}
  case 'decoration':{
   const b=child(ast.body),style=ast.style;
   if(style==='boxed'||style==='circle'){
    const pad=.18,side=Math.max(b.w+pad*2,b.h+b.d+pad*2),w=style==='circle'?side:b.w+pad*2,extra=style==='circle'?(side-b.h-b.d-pad*2)/2:0,h=b.h+pad+extra,d=b.d+pad+extra;const border=style==='boxed'?`<rect x=".025" y="${n(-h+.025)}" width="${n(w-.05)}" height="${n(h+d-.05)}"/>`:`<ellipse cx="${n(w/2)}" cy="${n((d-h)/2)}" rx="${n(w/2)}" ry="${n((h+d)/2)}"/>`;
    return box(w,h+.03,d+.03,move(b,(w-b.w)/2)+`<g fill="none" stroke="currentColor" stroke-width=".05">${border}</g>`,`<menclose notation="${style==='boxed'?'box':'circle'}">${b.mml}</menclose>`);
   }
   const under=style==='underline',y=under?b.d+.12:-b.h-.12,arc=style==='overarc';
   const mark=arc?`<path d="M 0 ${n(y)} Q ${n(b.w/2)} ${n(y-.3)} ${n(b.w)} ${n(y)}"/>`:`<path d="M 0 ${n(y)} H ${n(b.w)}"/>`;
   return box(b.w,under?b.h:b.h+(arc?.3:.16),under?b.d+.16:b.d,b.svg+`<g fill="none" stroke="currentColor" stroke-width=".045">${mark}</g>`,`<${under?'munder':'mover'} accent="true">${b.mml}<mo>${arc?'⌢':'¯'}</mo></${under?'munder':'mover'}>`);
  }
  case 'table':{
   const rows=ast.rows.map(row=>row.map(a=>child(a,{display:false}))),cols=ast.align.length,widths=Array(cols).fill(0),heights=[],depths=[];
   rows.forEach((row,r)=>{heights[r]=.7;depths[r]=.2;row.forEach((b,c)=>{widths[c]=Math.max(widths[c],b.w);heights[r]=Math.max(heights[r],b.h);depths[r]=Math.max(depths[r],b.d)})});
   const gap=ast.name==='aligned'?.35:.7,pad=.3,totalW=widths.reduce((a,b)=>a+b,0)+gap*(cols-1)+pad*2,totalH=heights.reduce((a,b)=>a+b,0)+depths.reduce((a,b)=>a+b,0)+.3*(rows.length-1)+pad*2,top=-totalH/2-.25;
   let y=top+pad,svg='',mml='',boundaries=[top+.04];
   rows.forEach((row,r)=>{y+=heights[r];let x=pad;mml+='<mtr>';for(let c=0;c<cols;c++){const b=row[c]||box(0,0,0,'','<mrow/>');const dx=ast.align[c]==='r'?widths[c]-b.w:ast.align[c]==='c'?(widths[c]-b.w)/2:0;svg+=move(b,x+dx,y);mml+='<mtd>'+b.mml+'</mtd>';x+=widths[c]+gap;}mml+='</mtr>';y+=depths[r]+.3;boundaries.push(r===rows.length-1?top+totalH-.04:y-.15)});
   for(const rule of ast.rules){svg+=`<path d="M .03 ${n(boundaries[rule.row])} H ${n(totalW-.03)}" fill="none" stroke="currentColor" stroke-width=".06"${rule.dashed?' stroke-dasharray=".14 .14"':''}/>`;}
   let col=0;for(const char of ast.spec){if(/[lcr]/.test(char))col++;else if(char==='|'||char===':'){const x=col===0?.03:col===cols?totalW-.03:pad+widths.slice(0,col).reduce((a,b)=>a+b,0)+gap*(col-.5);svg+=`<path d="M ${n(x)} ${n(top+.03)} V ${n(top+totalH-.03)}" fill="none" stroke="currentColor" stroke-width=".06"${char===':'?' stroke-dasharray=".14 .14"':''}/>`;}}
   const b=box(totalW,-top,top+totalH,svg,`<mtable columnalign="${ast.align.map(x=>({l:'left',r:'right',c:'center'}[x])).join(' ')}">${mml}</mtable>`);
   const delim={pmatrix:['(',')'],bmatrix:['[',']'],Bmatrix:['{','}'],vmatrix:['|','|'],Vmatrix:['‖','‖'],cases:['{','.']}[ast.name];
   if(!delim)return b;const l=fence(delim[0],b),r=fence(delim[1],b);return box(l.w+b.w+r.w,Math.max(b.h,l.h,r.h),Math.max(b.d,l.d,r.d),l.svg+move(b,l.w)+move(r,l.w+b.w),'<mrow><mo>'+escape(delim[0])+'</mo>'+b.mml+'<mo>'+escape(delim[1]==='.'?'':delim[1])+'</mo></mrow>');
  }
  default:throw new VlxError('TEX','Unsupported syntax node '+ast.kind);
 }
}
exports.layout=layout;
