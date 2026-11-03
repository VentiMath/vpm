'use strict';
const glyphs=require('./font/glyphs.json');
const {typography}=require('./typography.cjs');
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
function joinTag(b){const l=text('('),r=text(')');return box(l.w+b.w+r.w,Math.max(l.h,b.h,r.h),Math.max(l.d,b.d,r.d),l.svg+move(b,l.w)+move(r,l.w+b.w),'<mrow><mo>(</mo>'+b.mml+'<mo>)</mo></mrow>');}
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
  case 'text':{const value=typography(ast.text);let b;if(ast.font==='small-caps'){b=box(0,0,0,'','');for(const c of value){const small=c!==c.toUpperCase(),part=text(c.toUpperCase(),font||'normal'),scale=small?.8:1;b.svg+=move(part,b.w,0,scale);b.w+=part.w*scale;b.h=Math.max(b.h,part.h*scale);b.d=Math.max(b.d,part.d*scale);}}else b=text(value,ast.font||font||'normal');b.mml=ast.operator?'<mi mathvariant="normal">'+escape(ast.text)+'</mi>':'<mtext>'+escape(ast.text)+'</mtext>';if(ast.font&&ast.font!=='small-caps')b.mml='<mstyle mathvariant="'+ast.font+'">'+b.mml+'</mstyle>';return b;}
  case 'space':return box(ast.width,0,0,'',`<mspace width="${ast.width}em"/>`);
  case 'font':{
   const variants={mathit:'italic',mathbf:'bold',mathrm:'normal',mathbb:'double-struck',mathcal:'-tex-calligraphic',mathscr:'script',mathsf:'sans-serif',mathtt:'monospace'};
   let body=ast.body;
   if(ast.font==='mathbb'){
    const map={R:'ℝ',Z:'ℤ',N:'ℕ',Q:'ℚ',C:'ℂ',P:'ℙ',H:'ℍ'};
    const replace=a=>a.kind==='row'?{...a,children:a.children.map(replace)}:a.kind==='symbol'&&map[a.text]?{...a,text:map[a.text]}:a;
    body=replace(body);
   }
   const variant=variants[ast.font],b=child(body,{font:variant});b.mml=`<mstyle mathvariant="${variant==='-tex-calligraphic'?'script':variant}">${b.mml}</mstyle>`;return b;
  }
  case 'fixedbox':{const b=child(ast.body),w=ast.width??b.w;if(w<0)throw new VlxError('TEX','Box width must be nonnegative');const x=ast.align==='l'?0:ast.align==='r'?w-b.w:(w-b.w)/2;return box(w,b.h,b.d,move(b,x),`<mpadded width="${w}em">${b.mml}</mpadded>`);}
  case 'tag':{const b=child(ast.body),label=ast.star?b:joinTag(b);return box(label.w+1,label.h,label.d,move(label,1),'<mspace width="1em"/>'+label.mml);}
  case 'multicolumn':throw new VlxError('TEX','Multicolumn must occupy an entire table cell');
  case 'operator':{const b=child(ast.body);b.mml='<mrow>'+b.mml+'</mrow>';return b;}
  case 'phantom':{const b=child(ast.body);return box(ast.mode==='vphantom'?0:b.w,ast.mode==='hphantom'?0:b.h,ast.mode==='hphantom'?0:b.d,'',`<mpadded${ast.mode==='vphantom'?' width="0"':ast.mode==='hphantom'?' height="0" depth="0"':''}><mphantom>${b.mml}</mphantom></mpadded>`);}
  case 'style':{const b=child(ast.body,{display:ast.style==='displaystyle'}),s=ast.style==='scriptstyle'?.7:ast.style==='scriptscriptstyle'?.5:1;return box(b.w*s,b.h*s,b.d*s,move(b,0,0,s),`<mstyle displaystyle="${ast.style==='displaystyle'}" scriptlevel="${s===.5?2:s===.7?1:0}">${b.mml}</mstyle>`);}
  case 'delimiter':{const b=fence(ast.text,{h:ast.size*.75,d:ast.size*.25});b.mml='<mo>'+escape(ast.text)+'</mo>';return b;}
  case 'textrow':
  case 'row':{
   const boxes=ast.children.map(a=>child(a));let w=0,h=0,d=0,svg='',mml='';
   const type=a=>a.kind==='scripts'?type(a.base):a.class||(a.operator||a.kind==='operator'?'op':'ord');
   const types=ast.children.map(type);for(let i=0;i<types.length;i++)if(types[i]==='bin'&&(!i||['bin','rel','open'].includes(types[i-1])||i===types.length-1||['rel','close','punct'].includes(types[i+1])))types[i]='ord';
   for(let i=0;i<boxes.length;i++){
    const b=boxes[i],left=types[i-1],right=types[i];let space=0;
    if(ast.kind!=='textrow'&&i&&left!=='open'&&right!=='close')space=left==='rel'||right==='rel'?.278:left==='bin'||right==='bin'?.222:left==='punct'||left==='op'||right==='op'?.167:0;
    w+=space;svg+=move(b,w);w+=b.w;h=Math.max(h,b.h);d=Math.max(d,b.d);mml+=b.mml;
   }
   const labels=ast.children.map((a,i)=>a.kind==='tag'?i:-1).filter(i=>i>=0);if(labels.length>1)throw new VlxError('TEX','Duplicate equation tag');
   if(labels.length){const label=labels[0];mml='<mtable><mlabeledtr><mtd>'+boxes[label].mml+'</mtd><mtd><mrow>'+boxes.filter((_,i)=>i!==label).map(b=>b.mml).join('')+'</mrow></mtd></mlabeledtr></mtable>';return box(w,h,d,svg,mml);}
   return box(w,h,d,svg,'<mrow>'+mml+'</mrow>');
  }
  case 'binomial':
  case 'fraction':{
   const full=['dfrac','dbinom'].includes(ast.style)||(display&&!['tfrac','tbinom'].includes(ast.style)),scale=full?1:.72;
   const a=child(ast.numerator,{display:false}),b=child(ast.denominator,{display:false});
   const w=Math.max(a.w,b.w)*scale+.24,axis=-.25,gap=full?.2:.13,t=.06;
   const y1=axis-gap-a.d*scale-t/2,y2=axis+gap+b.h*scale+t/2;
   const bFraction=box(w,Math.max(-y1+a.h*scale,.3),y2+b.d*scale,move(a,(w-a.w*scale)/2,y1,scale)+move(b,(w-b.w*scale)/2,y2,scale)+(ast.kind==='binomial'?'':`<rect x="0" y="${n(axis-t/2)}" width="${n(w)}" height="${t}" fill="currentColor"/>`),'<mfrac'+(ast.kind==='binomial'?' linethickness="0"':'')+'>'+a.mml+b.mml+'</mfrac>');
   if(ast.kind!=='binomial')return bFraction;const l=fence('(',bFraction),r=fence(')',bFraction);return box(l.w+w+r.w,Math.max(l.h,r.h,bFraction.h),Math.max(l.d,r.d,bFraction.d),l.svg+move(bFraction,l.w)+move(r,l.w+w),'<mrow><mo>(</mo>'+bFraction.mml+'<mo>)</mo></mrow>');
  }
  case 'scripts':{
   const base=child(ast.base),sup=ast.sup?child(ast.sup,{display:false}):null,sub=ast.sub?child(ast.sub,{display:false}):null,s=.7;
   if((display||ast.base.alwaysLimits)&&ast.base.limits){
    const w=Math.max(base.w,sup?sup.w*s:0,sub?sub.w*s:0),up=-(base.h+.18+(sup?sup.d*s:0)),down=base.d+.18+(sub?sub.h*s:0);
    return box(w,sup?-up+sup.h*s:base.h,sub?down+sub.d*s:base.d,move(base,(w-base.w)/2)+(sup?move(sup,(w-sup.w*s)/2,up,s):'')+(sub?move(sub,(w-sub.w*s)/2,down,s):''),`<${sup&&sub?'munderover':sup?'mover':'munder'}>${base.mml}${sub?sub.mml:''}${sup?sup.mml:''}</${sup&&sub?'munderover':sup?'mover':'munder'}>`);
   }
   const up=sup?-Math.max(.48,base.h-.15,sup.d*s+.32):0;let down=sub?Math.max(.25,base.d+.14,sub.h*s-.2):0;
   if(sup&&sub)down=Math.max(down,up+sup.d*s+.18+sub.h*s);
   const w=base.w+.04+Math.max(sup?sup.w*s:0,sub?sub.w*s:0),tag=sup&&sub?'msubsup':sup?'msup':'msub';
   return box(w,Math.max(base.h,sup?-up+sup.h*s:0),Math.max(base.d,sub?down+sub.d*s:0),base.svg+(sup?move(sup,base.w+.04,up,s):'')+(sub?move(sub,base.w+.04,down,s):''),`<${tag}>${base.mml}${sub?sub.mml:''}${sup?sup.mml:''}</${tag}>`);
  }
  case 'root':{
   const b=child(ast.body),idx=ast.index?child(ast.index,{display:false}):null,offset=idx?Math.max(.2,idx.w*.5):0,left=.75+offset,top=-Math.max(b.h,.6)-.14,bottom=Math.max(b.d,.06),w=b.w+left+.1;
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
   if(['overrightarrow','overleftarrow','overleftrightarrow','widehat','underbrace','overbrace'].includes(style)){
    const under=style==='underbrace',y=under?b.d+.16:-b.h-.16,w=Math.max(b.w,.3),middle=w/2;
    let path,mark;
    if(style==='widehat'){path=`M 0 ${n(y)} L ${n(middle)} ${n(y-.22)} L ${n(w)} ${n(y)}`;mark='^';}
    else if(style.endsWith('brace')){const direction=under?1:-1;path=`M 0 ${n(y)} Q 0 ${n(y+direction*.12)} ${n(w*.25)} ${n(y+direction*.12)} Q ${n(middle)} ${n(y+direction*.12)} ${n(middle)} ${n(y+direction*.25)} Q ${n(middle)} ${n(y+direction*.12)} ${n(w*.75)} ${n(y+direction*.12)} Q ${n(w)} ${n(y+direction*.12)} ${n(w)} ${n(y)}`;mark=under?'⏟':'⏞';}
    else{path=`M 0 ${n(y)} H ${n(w)}`;if(style!=='overleftarrow')path+=` M ${n(w-.18)} ${n(y-.1)} L ${n(w)} ${n(y)} L ${n(w-.18)} ${n(y+.1)}`;if(style!=='overrightarrow')path+=` M .18 ${n(y-.1)} L 0 ${n(y)} L .18 ${n(y+.1)}`;mark=style==='overrightarrow'?'→':style==='overleftarrow'?'←':'↔';}
    return box(w,under?b.h:b.h+.45,under?b.d+.45:b.d,move(b,(w-b.w)/2)+`<path d="${path}" fill="none" stroke="currentColor" stroke-width=".045"/>`,`<${under?'munder':'mover'} accent="true">${b.mml}<mo>${mark}</mo></${under?'munder':'mover'}>`);
   }
   const under=style==='underline',y=under?b.d+.12:-b.h-.12,arc=style==='overarc';
   const mark=arc?`<path d="M 0 ${n(y)} Q ${n(b.w/2)} ${n(y-.3)} ${n(b.w)} ${n(y)}"/>`:`<path d="M 0 ${n(y)} H ${n(b.w)}"/>`;
   return box(b.w,under?b.h:b.h+(arc?.3:.16),under?b.d+.16:b.d,b.svg+`<g fill="none" stroke="currentColor" stroke-width=".045">${mark}</g>`,`<${under?'munder':'mover'} accent="true">${b.mml}<mo>${arc?'⌢':'¯'}</mo></${under?'munder':'mover'}>`);
  }
  case 'table':{
   const cols=ast.align.length,widths=Array(cols).fill(0),heights=[],depths=[],rows=[];
   for(const [r,row] of ast.rows.entries()){
    let col=0;heights[r]=.7;depths[r]=.2;rows[r]=[];
    for(const entry of row){
     const span=entry.kind==='row'&&entry.children.length===1&&entry.children[0].kind==='multicolumn'?entry.children[0]:null;
     const b=child(span?span.body:entry,{display:false}),count=span?span.span:1;
     if(col+count>cols)throw new VlxError('TEX','Too many array cells');
     rows[r].push({b,col,count,spec:span?.spec,align:span?span.spec.match(/[lcr]/)[0]:ast.align[col]});
     if(count===1)widths[col]=Math.max(widths[col],b.w);heights[r]=Math.max(heights[r],b.h);depths[r]=Math.max(depths[r],b.d);col+=count;
    }
   }
   const gap=/^align/.test(ast.name)?.35:.7,pad=.3;
   for(const row of rows)for(const {b,col,count}of row)if(count>1){const available=widths.slice(col,col+count).reduce((a,b)=>a+b,0)+gap*(count-1);if(b.w>available){const extra=(b.w-available)/count;for(let c=col;c<col+count;c++)widths[c]+=extra;}}
   const positions=[pad];for(let c=0;c<cols;c++)positions.push(positions[c]+widths[c]+gap);
   const totalW=widths.reduce((a,b)=>a+b,0)+gap*(cols-1)+pad*2,totalH=heights.reduce((a,b)=>a+b,0)+depths.reduce((a,b)=>a+b,0)+.3*(rows.length-1)+pad*2,top=-totalH/2-.25;
   let y=top+pad,svg='',mml='',boundaries=[top+.04];
   rows.forEach((row,r)=>{
    y+=heights[r];mml+='<mtr>';let covered=0;
    for(const {b,col,count,align}of row){const width=widths.slice(col,col+count).reduce((a,b)=>a+b,0)+gap*(count-1),dx=align==='r'?width-b.w:align==='c'?(width-b.w)/2:0;
     svg+=move(b,positions[col]+dx,y);mml+=`<mtd${count>1?' columnspan="'+count+'"':''}>${b.mml}</mtd>`;covered+=count;
    }
    for(;covered<cols;covered++)mml+='<mtd><mrow/></mtd>';mml+='</mtr>';y+=depths[r]+.3;boundaries.push(r===rows.length-1?top+totalH-.04:y-.15);
   });
   for(const rule of ast.rules)svg+=`<path d="M .03 ${n(boundaries[rule.row])} H ${n(totalW-.03)}" fill="none" stroke="currentColor" stroke-width=".06"${rule.dashed?' stroke-dasharray=".14 .14"':''}/>`;
   const defaults=new Map();let col=0;for(const char of ast.spec){if(/[lcr]/.test(char))col++;else if(char==='|'||char===':')defaults.set(col,char);}
   for(let r=0;r<rows.length;r++){
    const rules=new Map(defaults);
    for(const cell of rows[r])if(cell.spec){
     for(let c=cell.col;c<=cell.col+cell.count;c++)rules.delete(c);
     if(/^[:|]/.test(cell.spec))rules.set(cell.col,cell.spec[0]);
     if(/[:|]$/.test(cell.spec))rules.set(cell.col+cell.count,cell.spec.at(-1));
    }
    for(const [col,char] of rules){const x=col===0?.03:col===cols?totalW-.03:positions[col]-gap/2;
     svg+=`<path d="M ${n(x)} ${n(boundaries[r])} V ${n(boundaries[r+1])}" fill="none" stroke="currentColor" stroke-width=".06"${char===':'?' stroke-dasharray=".14 .14" stroke-dashoffset="'+n(boundaries[r]-top)+'"':''}/>`;
    }
   }
   const b=box(totalW,-top,top+totalH,svg,`<mtable columnalign="${ast.align.map(x=>({l:'left',r:'right',c:'center'}[x])).join(' ')}">${mml}</mtable>`);
   const delim={pmatrix:['(',')'],bmatrix:['[',']'],Bmatrix:['{','}'],vmatrix:['|','|'],Vmatrix:['‖','‖'],cases:['{','.']}[ast.name];
   if(!delim){if(ast.name==='smallmatrix')return box(b.w*.7,b.h*.7,b.d*.7,move(b,0,0,.7),'<mstyle scriptlevel="1">'+b.mml+'</mstyle>');return b;}const l=fence(delim[0],b),r=fence(delim[1],b);return box(l.w+b.w+r.w,Math.max(b.h,l.h,r.h),Math.max(b.d,l.d,r.d),l.svg+move(b,l.w)+move(r,l.w+b.w),'<mrow><mo>'+escape(delim[0])+'</mo>'+b.mml+'<mo>'+escape(delim[1]==='.'?'':delim[1])+'</mo></mrow>');
  }
  default:throw new VlxError('TEX','Unsupported syntax node '+ast.kind);
 }
}
exports.layout=layout;

exports.text=text;
exports.move=move;
exports.box=box;
