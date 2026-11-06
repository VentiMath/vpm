'use strict';
const {paths,variants:glyphs}=require('./font/glyphs.json');
const {typography}=require('./typography.cjs');
const {VlxError}=require('./source.cjs');
function createLayout({element:E,text:T,group:G,start:S,append:A}){
// Outlines come from a fixed, finite font pool, independent of user input. Reuse
// their leaf output while each occurrence retains its own placement/metrics.
const outlines=new Map();
const n=x=>Number(x.toFixed(5));
const transform=(x,y,scale)=>`translate(${n(x)} ${n(y)}) scale(${n(scale)})`;
const move=(b,x=0,y=0,scale=1)=>G(transform(x,y,scale),b.svg);
const box=(w,h,d,svg,mml)=>({w,h:Math.max(0,h),d:Math.max(0,d),svg,mml});
function glyph(char,font='normal'){
 const metric=glyphs[font]?.[char]||(font==='bold-italic'?glyphs.bold[char]:undefined)||glyphs.normal[char];
 if(!metric){
  // U+00AD is discretionary: without a chosen hyphenation break it has no ink
  // or advance. Never treat other unsupported/control characters as blank.
  if(char==='\u00ad')return box(0,0,0,null,null);
  // Preserve fullwidth punctuation as a one-em cell, using the corresponding
  // outline. Keep the original Unicode character in semantic/text output.
  if(char==='，'||char==='：'){const b=glyph(char==='，'?',':':',font);return box(1,b.h,b.d,move(b,(1-b.w)/2),null);}
  throw new VlxError('UNSUPPORTED_GLYPH','No outline for '+char);
 }
 const [h,d,w,ic,id]=metric,path=paths[id];
 let outline=null;
 if(path){outline=outlines.get(id);if(outline===undefined){outline=E('path',{d:path,transform:'scale(.001 -.001)',fill:'currentColor'});outlines.set(id,outline);}}
 return box(w+ic,h,d,outline,null);
}
function text(value,font='normal'){
 let w=0,h=0,d=0,svg=S();
 for(const char of value){const b=glyph(char,font);svg=A(svg,move(b,w));w+=b.w;h=Math.max(h,b.h);d=Math.max(d,b.d);}
 return box(w,h,d,svg,null);
}
function fence(char,body){
 if(char==='.')return box(0,0,0,null,null);
 const height=Math.max(1,body.h+body.d+.16);let choice='normal';
 for(const font of ['normal','-size3','-size4']){choice=font;const m=glyphs[font]?.[char]||glyphs.normal[char];if(m&&m[0]+m[1]>=height)break;}
 const b=glyph(char,choice),scaleY=Math.max(1,height/(b.h+b.d)),mid=(body.d-body.h)/2;
 const y=mid+(b.h-b.d)*scaleY/2;
 return box(b.w,Math.max(0,b.h*scaleY-y),Math.max(0,b.d*scaleY+y),E('g',{transform:`translate(0 ${n(y)}) scale(1 ${n(scaleY)})`},b.svg),null);
}
function joinTag(b){const l=text('('),r=text(')');return box(l.w+b.w+r.w,Math.max(l.h,b.h,r.h),Math.max(l.d,b.d,r.d),[l.svg,move(b,l.w),move(r,l.w+b.w)],E('mrow',null,E('mo',null,T('(')),b.mml,E('mo',null,T(')'))));}
function layout(ast,options={}){
 const display=!!options.display,font=options.font,bold=!!options.bold;
 const weight=style=>bold?(style==='italic'?'bold-italic':style==='normal'?'bold':style):style;
 const child=(a,extra={})=>layout(a,{display,font,bold,...extra});
 switch(ast.kind){
  case 'symbol':{
   const style=font||((/^[a-zA-Zα-ωϕϵϑς]$/u.test(ast.text))?'italic':'normal');
   const b=glyph(ast.text,ast.large&&display&&!bold?'-largeop':weight(style));
   const identifier=ast.class==='ord'&&/^[\p{L}]$/u.test(ast.text);
   b.mml=E(identifier?'mi':'mo',bold?{mathvariant:weight(style)}:null,T(ast.text));return b;
  }
  case 'negation':{
   const b=child(ast.body),h=Math.max(b.h,.7),d=Math.max(b.d,.15),x0=b.w*.18,x1=b.w*.82;
   const tag=ast.body.class==='ord'&&/^[\p{L}]$/u.test(ast.body.text)?'mi':'mo';
   return box(b.w,h+.025,d+.025,[b.svg,E('path',{d:`M ${n(x0)} ${n(d)} L ${n(x1)} ${n(-h)}`,fill:'none',stroke:'currentColor',strokeWidth:'.05'})],E(tag,null,T(ast.body.text+'\u0338')));
  }
  case 'number':{const b=text(ast.text,weight(font||'normal'));b.mml=E('mn',bold?{mathvariant:weight(font||'normal')}:null,T(ast.text));return b;}
  case 'text':{
   const value=typography(ast.text);let b;
   if(ast.font==='small-caps'){
    b=box(0,0,0,S(),null);
    for(const c of value){const small=c!==c.toUpperCase(),part=text(c.toUpperCase(),weight(font||'normal')),scale=small?.8:1;b.svg=A(b.svg,move(part,b.w,0,scale));b.w+=part.w*scale;b.h=Math.max(b.h,part.h*scale);b.d=Math.max(b.d,part.d*scale);}
   }else if(ast.font==='slanted'){
    b=text(value,weight(font||'normal'));b.svg=E('g',{transform:`translate(${n(.2*b.d)} 0) skewX(-11.30993)`},b.svg);b.w+=.2*(b.h+b.d);
   }else b=text(value,weight(ast.font||font||'normal'));
   b.mml=ast.operator?E('mi',{mathvariant:'normal'},T(ast.text)):E('mtext',null,T(ast.text));
   if(ast.font==='slanted')b.mml=E('mstyle',{mathvariant:weight(font||'normal'),style:{fontStyle:'oblique'}},b.mml);
   else if(bold||ast.font&&ast.font!=='small-caps')b.mml=E('mstyle',{mathvariant:weight(ast.font==='small-caps'?'normal':ast.font||font||'normal')},b.mml);
   return b;
  }
  case 'space':return box(ast.width,0,0,null,E('mspace',{width:ast.width+'em'}));
  case 'linebreak':return box(0,0,0,null,E('mspace',{linebreak:'newline'}));
  case 'class':return child(ast.body);
  case 'boldsymbol':return child(ast.body,{bold:true});
  case 'rule':return box(ast.width,Math.max(0,ast.height+ast.raise),Math.max(0,-ast.raise),E('rect',{x:'0',y:n(-ast.height-ast.raise),width:n(ast.width),height:n(ast.height),fill:'currentColor'}),E('mspace',{width:ast.width+'em',height:Math.max(0,ast.height+ast.raise)+'em',depth:Math.max(0,-ast.raise)+'em',mathbackground:'currentColor'}));
  case 'stack':{
   const b=child(ast.body),mark=child(ast.mark,{display:false}),scale=.7,w=Math.max(b.w,mark.w*scale),y=ast.under?b.d+.12+mark.h*scale:-b.h-.12-mark.d*scale;
   return box(w,ast.under?b.h:-y+mark.h*scale,ast.under?y+mark.d*scale:b.d,[move(b,(w-b.w)/2),move(mark,(w-mark.w*scale)/2,y,scale)],E(ast.under?'munder':'mover',null,b.mml,mark.mml));
  }
  case 'font':{
   const variants={mathit:'italic',mathbf:'bold',mathrm:'normal',mathbb:'double-struck',mathcal:'-tex-calligraphic',mathscr:'script',mathsf:'sans-serif',mathtt:'monospace'};
   let body=ast.body;
   if(ast.font==='mathbb'){
    const map={R:'ℝ',Z:'ℤ',N:'ℕ',Q:'ℚ',C:'ℂ',P:'ℙ',H:'ℍ'};
    const replace=a=>a.kind==='row'?{...a,children:a.children.map(replace)}:a.kind==='symbol'&&map[a.text]?{...a,text:map[a.text]}:a;
    body=replace(body);
   }
   const variant=variants[ast.font],b=child(body,{font:variant});b.mml=E('mstyle',{mathvariant:variant==='-tex-calligraphic'?'script':variant},b.mml);return b;
  }
  case 'fixedbox':{const b=child(ast.body),w=ast.width??b.w;if(w<0)throw new VlxError('TEX','Box width must be nonnegative');const x=ast.align==='l'?0:ast.align==='r'?w-b.w:(w-b.w)/2;return box(w,b.h,b.d,move(b,x),E('mpadded',{width:w+'em'},b.mml));}
  case 'resolved-reference':{
   const inner=child(ast.body),b=ast.parentheses?joinTag(inner):inner;
   b.svg=E('a',{href:'#'+ast.id,tabIndex:0,role:'link','aria-label':'Equation '+ast.text},b.svg);
   return b;
  }
  case 'numbered':{
   const body=child(ast.body),label=child(ast.tag.body),tag=ast.tag.star?label:joinTag(label);
   return box(body.w+1+tag.w,Math.max(body.h,tag.h),Math.max(body.d,tag.d),[body.svg,move(tag,body.w+1)],E('mtable',null,E('mlabeledtr',null,E('mtd',null,tag.mml),E('mtd',null,body.mml))));
  }
  case 'tag':{const b=child(ast.body),label=ast.star?b:joinTag(b);return box(label.w+1,label.h,label.d,move(label,1),[E('mspace',{width:'1em'}),label.mml]);}
  case 'multicolumn':throw new VlxError('TEX','Multicolumn must occupy an entire table cell');
  case 'operator':{const b=child(ast.body);b.mml=E('mrow',null,b.mml);return b;}
  case 'phantom':{const b=child(ast.body);return box(ast.mode==='vphantom'?0:b.w,ast.mode==='hphantom'?0:b.h,ast.mode==='hphantom'?0:b.d,null,E('mpadded',ast.mode==='vphantom'?{width:'0'}:ast.mode==='hphantom'?{height:'0',depth:'0'}:null,E('mphantom',null,b.mml)));}
  case 'style':{const b=child(ast.body,{display:ast.style==='displaystyle'}),s=ast.style==='scriptstyle'?.7:ast.style==='scriptscriptstyle'?.5:1;return box(b.w*s,b.h*s,b.d*s,move(b,0,0,s),E('mstyle',{displaystyle:String(ast.style==='displaystyle'),scriptlevel:s===.5?2:s===.7?1:0},b.mml));}
  case 'delimiter':{const b=fence(ast.text,{h:ast.size*.75,d:ast.size*.25});b.mml=E('mo',null,T(ast.text));return b;}
  case 'textrow':
  case 'row':{
   if(ast.children.some(a=>a.kind==='linebreak')){
    const lines=[[]],gaps=[];for(const a of ast.children){if(a.kind==='linebreak'){gaps.push(a.gap);lines.push([]);}else lines.at(-1).push(a);}
    if(lines.length>128)throw new VlxError('LIMIT','At most 128 explicit lines are supported');
    const boxes=lines.map(children=>child({kind:'row',children}));let y=0,h=0,d=0,svg=S();const w=Math.max(...boxes.map(b=>b.w));
    for(let i=0;i<boxes.length;i++){if(i)y+=Math.max(.2,boxes[i-1].d)+.4+Math.max(.7,boxes[i].h)+(gaps[i-1]||0);svg=A(svg,move(boxes[i],0,y));h=Math.max(h,Math.max(.7,boxes[i].h)-y);d=Math.max(d,y+Math.max(.2,boxes[i].d));}
    return box(w,h,d,svg,E('mtable',{columnalign:'left'},boxes.map(b=>E('mtr',null,E('mtd',null,b.mml)))));
   }
   const boxes=ast.children.map(a=>child(a));let w=0,h=0,d=0,svg=S(),mml=S();
   const type=a=>a.kind==='scripts'?type(a.base):a.class||(a.operator||a.kind==='operator'?'op':'ord');
   const types=ast.children.map(type);for(let i=0;i<types.length;i++)if(types[i]==='bin'&&(!i||['bin','rel','open'].includes(types[i-1])||i===types.length-1||['rel','close','punct'].includes(types[i+1])))types[i]='ord';
   for(let i=0;i<boxes.length;i++){
    const b=boxes[i],left=types[i-1],right=types[i];let space=0;
    if(ast.kind!=='textrow'&&i&&left!=='open'&&right!=='close')space=left==='rel'||right==='rel'?.278:left==='bin'||right==='bin'?.222:left==='punct'||left==='op'||right==='op'?.167:0;
    w+=space;svg=A(svg,move(b,w));w+=b.w;h=Math.max(h,b.h);d=Math.max(d,b.d);mml=A(mml,b.mml);
   }
   const labels=ast.children.map((a,i)=>a.kind==='tag'?i:-1).filter(i=>i>=0);if(labels.length>1)throw new VlxError('TEX','Duplicate equation tag');
   if(labels.length){const label=labels[0];return box(w,h,d,svg,E('mtable',null,E('mlabeledtr',null,E('mtd',null,boxes[label].mml),E('mtd',null,E('mrow',null,boxes.filter((_,i)=>i!==label).map(b=>b.mml))))));}
   return box(w,h,d,svg,E('mrow',null,mml));
  }
  case 'binomial':
  case 'fraction':{
   const full=['dfrac','dbinom','cfrac'].includes(ast.style)||(display&&!['tfrac','tbinom'].includes(ast.style)),scale=full?1:.72;
   const a=child(ast.numerator,{display:false}),b=child(ast.denominator,{display:false});
   const w=Math.max(a.w,b.w)*scale+.24,axis=-.25,gap=full?.2:.13,t=.06;
   const y1=axis-gap-a.d*scale-t/2,y2=axis+gap+b.h*scale+t/2;
   const bFraction=box(w,Math.max(-y1+a.h*scale,.3),y2+b.d*scale,[move(a,(w-a.w*scale)/2,y1,scale),move(b,(w-b.w*scale)/2,y2,scale),ast.kind==='binomial'?null:E('rect',{x:'0',y:n(axis-t/2),width:n(w),height:t,fill:'currentColor'})],E('mfrac',ast.kind==='binomial'?{linethickness:'0'}:null,a.mml,b.mml));
   if(ast.kind!=='binomial')return bFraction;const l=fence('(',bFraction),r=fence(')',bFraction);return box(l.w+w+r.w,Math.max(l.h,r.h,bFraction.h),Math.max(l.d,r.d,bFraction.d),[l.svg,move(bFraction,l.w),move(r,l.w+w)],E('mrow',null,E('mo',null,T('(')),bFraction.mml,E('mo',null,T(')'))));
  }
  case 'scripts':{
   const base=child(ast.base),sup=ast.sup?child(ast.sup,{display:false}):null,sub=ast.sub?child(ast.sub,{display:false}):null,s=.7;
   if((display||ast.base.alwaysLimits)&&ast.base.limits){
    const w=Math.max(base.w,sup?sup.w*s:0,sub?sub.w*s:0),up=-(base.h+.18+(sup?sup.d*s:0)),down=base.d+.18+(sub?sub.h*s:0);
    return box(w,sup?-up+sup.h*s:base.h,sub?down+sub.d*s:base.d,[move(base,(w-base.w)/2),sup?move(sup,(w-sup.w*s)/2,up,s):null,sub?move(sub,(w-sub.w*s)/2,down,s):null],E(sup&&sub?'munderover':sup?'mover':'munder',null,base.mml,sub?.mml,sup?.mml));
   }
   const up=sup?-Math.max(.48,base.h-.15,sup.d*s+.32):0;let down=sub?Math.max(.25,base.d+.14,sub.h*s-.2):0;
   if(sup&&sub)down=Math.max(down,up+sup.d*s+.18+sub.h*s);
   const w=base.w+.04+Math.max(sup?sup.w*s:0,sub?sub.w*s:0),tag=sup&&sub?'msubsup':sup?'msup':'msub';
   return box(w,Math.max(base.h,sup?-up+sup.h*s:0),Math.max(base.d,sub?down+sub.d*s:0),[base.svg,sup?move(sup,base.w+.04,up,s):null,sub?move(sub,base.w+.04,down,s):null],E(tag,null,base.mml,sub?.mml,sup?.mml));
  }
  case 'root':{
   const b=child(ast.body),idx=ast.index?child(ast.index,{display:false}):null;
   // Nest the degree above the radical's leading hook. A degree at x=0 looks
   // attached to the previous coefficient, especially in 10\sqrt[3]{10}.
   const offset=idx ? .12+Math.max(0,idx.w*.5-.35) : 0,left=.75+offset,top=-Math.max(b.h,.6)-.14,bottom=Math.max(b.d,.06),w=b.w+left+.1;
   // MathML Core's fallback degree-bottom raise is 60% of radical height.
   const indexX=idx?offset+.36-idx.w*.5:0,indexY=idx?bottom-(bottom-top)*.6-idx.d*.5:0;
   const stroke=E('path',{d:`M ${n(offset+.06)} ${n((bottom+top)*.25)} L ${n(offset+.23)} ${n((bottom+top)*.25-.1)} L ${n(offset+.4)} ${n(bottom)} L ${n(offset+.7)} ${n(top)} H ${n(w)}`,fill:'none',stroke:'currentColor',strokeWidth:'.055',strokeLinejoin:'round'});
   return box(w,Math.max(-top+.03,idx?-indexY+idx.h*.5:0),bottom+.03,[stroke,move(b,left),idx?move(idx,indexX,indexY,.5):null],idx?E('mroot',null,b.mml,idx.mml):E('msqrt',null,b.mml));
  }
  case 'fenced':{
   const b=child(ast.body),left=fence(ast.left,b),right=fence(ast.right,b);return box(left.w+b.w+right.w,Math.max(b.h,left.h,right.h),Math.max(b.d,left.d,right.d),[left.svg,move(b,left.w),move(right,left.w+b.w)],E('mrow',null,E('mo',{stretchy:'true'},T(ast.left==='.'?'':ast.left)),b.mml,E('mo',{stretchy:'true'},T(ast.right==='.'?'':ast.right))));
  }
  case 'color':{const b=child(ast.body);b.svg=E('g',{color:ast.color},b.svg);b.mml=E('mstyle',{mathcolor:ast.color},b.mml);return b;}
  case 'decoration':{
   const b=child(ast.body),style=ast.style;
   if(style==='cancel')return box(b.w,b.h+.025,b.d+.025,[b.svg,E('path',{d:`M 0 ${n(b.d)} L ${n(b.w)} ${n(-b.h)}`,fill:'none',stroke:'currentColor',strokeWidth:'.05'})],E('menclose',{notation:'updiagonalstrike'},b.mml));
   if(style==='tilde'||style==='widetilde'){
    const w=Math.max(b.w,.35),y=-b.h-.14;
    return box(w,b.h+.34,b.d,[move(b,(w-b.w)/2),E('path',{d:`M 0 ${n(y)} C ${n(w*.3)} ${n(y-.25)},${n(w*.7)} ${n(y+.1)},${n(w)} ${n(y-.14)}`,fill:'none',stroke:'currentColor',strokeWidth:'.045'})],E('mover',{accent:'true'},b.mml,E('mo',null,T('~'))));
   }
   if(style==='boxed'||style==='circle'){
    const pad=.18,side=Math.max(b.w+pad*2,b.h+b.d+pad*2),w=style==='circle'?side:b.w+pad*2,extra=style==='circle'?(side-b.h-b.d-pad*2)/2:0,h=b.h+pad+extra,d=b.d+pad+extra;
    const border=style==='boxed'?E('rect',{x:'.025',y:n(-h+.025),width:n(w-.05),height:n(h+d-.05)}):E('ellipse',{cx:n(w/2),cy:n((d-h)/2),rx:n(w/2),ry:n((h+d)/2)});
    return box(w,h+.03,d+.03,[move(b,(w-b.w)/2),E('g',{fill:'none',stroke:'currentColor',strokeWidth:'.05'},border)],E('menclose',{notation:style==='boxed'?'box':'circle'},b.mml));
   }
   if(['overrightarrow','overleftarrow','overleftrightarrow','widehat','underbrace','overbrace'].includes(style)){
    const under=style==='underbrace',y=under?b.d+.16:-b.h-.16,w=Math.max(b.w,.3),middle=w/2;let path,mark;
    if(style==='widehat'){path=`M 0 ${n(y)} L ${n(middle)} ${n(y-.22)} L ${n(w)} ${n(y)}`;mark='^';}
    else if(style.endsWith('brace')){const direction=under?1:-1;path=`M 0 ${n(y)} Q 0 ${n(y+direction*.12)} ${n(w*.25)} ${n(y+direction*.12)} Q ${n(middle)} ${n(y+direction*.12)} ${n(middle)} ${n(y+direction*.25)} Q ${n(middle)} ${n(y+direction*.12)} ${n(w*.75)} ${n(y+direction*.12)} Q ${n(w)} ${n(y+direction*.12)} ${n(w)} ${n(y)}`;mark=under?'⏟':'⏞';}
    else{path=`M 0 ${n(y)} H ${n(w)}`;if(style!=='overleftarrow')path+=` M ${n(w-.18)} ${n(y-.1)} L ${n(w)} ${n(y)} L ${n(w-.18)} ${n(y+.1)}`;if(style!=='overrightarrow')path+=` M .18 ${n(y-.1)} L 0 ${n(y)} L .18 ${n(y+.1)}`;mark=style==='overrightarrow'?'→':style==='overleftarrow'?'←':'↔';}
    return box(w,under?b.h:b.h+.45,under?b.d+.45:b.d,[move(b,(w-b.w)/2),E('path',{d:path,fill:'none',stroke:'currentColor',strokeWidth:'.045'})],E(under?'munder':'mover',{[under?'accentunder':'accent']:'true'},b.mml,E('mo',null,T(mark))));
   }
   const under=style==='underline',y=under?b.d+.12:-b.h-.12,arc=style==='overarc';
   const mark=E('path',{d:arc?`M 0 ${n(y)} Q ${n(b.w/2)} ${n(y-.3)} ${n(b.w)} ${n(y)}`:`M 0 ${n(y)} H ${n(b.w)}`});
   return box(b.w,under?b.h:b.h+(arc?.3:.16),under?b.d+.16:b.d,[b.svg,E('g',{fill:'none',stroke:'currentColor',strokeWidth:'.045'},mark)],E(under?'munder':'mover',{[under?'accentunder':'accent']:'true'},b.mml,E('mo',null,T(arc?'⌢':'¯'))));
  }
  case 'table':{
   const tags=ast.rowTags?.map(tag=>{if(!tag)return null;const b=child(tag.body);return tag.star?b:joinTag(b);});
   const tagWidth=tags?.some(Boolean)?1+Math.max(...tags.map(b=>b?.w||0)):0;
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
   if(tags)for(let r=0;r<rows.length;r++)if(tags[r]){heights[r]=Math.max(heights[r],tags[r].h);depths[r]=Math.max(depths[r],tags[r].d);}
   const gap=/^align/.test(ast.name)?.35:.7,pad=.3,gaps=Array.from({length:cols+1},(_,c)=>ast.gaps?.[c]??(c===0||c===cols?pad:gap)),rowAfter=rows.map((_,r)=>ast.rowAfter?.[r]||0);
   const between=(col,count)=>gaps.slice(col+1,col+count).reduce((a,b)=>a+b,0);
   for(const row of rows)for(const {b,col,count}of row)if(count>1){const available=widths.slice(col,col+count).reduce((a,b)=>a+b,0)+between(col,count);if(b.w>available){const extra=(b.w-available)/count;for(let c=col;c<col+count;c++)widths[c]+=extra;}}
   const positions=[gaps[0]];for(let c=0;c<cols;c++)positions.push(positions[c]+widths[c]+gaps[c+1]);
   const totalW=widths.reduce((a,b)=>a+b,0)+gaps.reduce((a,b)=>a+b,0),totalH=heights.reduce((a,b)=>a+b,0)+depths.reduce((a,b)=>a+b,0)+.3*(rows.length-1)+rowAfter.reduce((a,b)=>a+b,0)+pad*2,top=-totalH/2-.25;
   let y=top+pad,svg=S(),mml=S();const boundaries=[top+.04];
   rows.forEach((row,r)=>{
    y+=heights[r];let covered=0;const cells=[];
    for(const {b,col,count,align}of row){const width=widths.slice(col,col+count).reduce((a,b)=>a+b,0)+between(col,count),dx=align==='r'?width-b.w:align==='c'?(width-b.w)/2:0;
     svg=A(svg,move(b,positions[col]+dx,y));cells.push(E('mtd',count>1?{columnspan:count}:null,b.mml));covered+=count;
    }
    for(;covered<cols;covered++)cells.push(E('mtd',null,E('mrow')));if(tags?.[r])svg=A(svg,move(tags[r],totalW+tagWidth-tags[r].w,y));mml=A(mml,tags?.[r]?E('mlabeledtr',null,E('mtd',null,tags[r].mml),cells):E('mtr',null,cells));y+=depths[r]+.3+rowAfter[r];boundaries.push(r===rows.length-1?top+totalH-.04:y-.15);
   });
   for(const rule of ast.rules)svg=A(svg,E('path',{d:`M .03 ${n(boundaries[rule.row])} H ${n(totalW-.03)}`,fill:'none',stroke:'currentColor',strokeWidth:'.06',...(rule.dashed?{strokeDasharray:'.14 .14'}:{})}));
   const defaults=new Map();let col=0;for(const char of ast.spec){if(/[lcr]/.test(char))col++;else if(char==='|'||char===':')defaults.set(col,char);}
   for(let r=0;r<rows.length;r++){
    const rules=new Map(defaults);
    for(const cell of rows[r])if(cell.spec){
     for(let c=cell.col;c<=cell.col+cell.count;c++)rules.delete(c);
     if(/^[:|]/.test(cell.spec))rules.set(cell.col,cell.spec[0]);
     if(/[:|]$/.test(cell.spec))rules.set(cell.col+cell.count,cell.spec.at(-1));
    }
    for(const [col,char] of rules){const x=col===0?.03:col===cols?totalW-.03:positions[col]-gaps[col]/2;
     svg=A(svg,E('path',{d:`M ${n(x)} ${n(boundaries[r])} V ${n(boundaries[r+1])}`,fill:'none',stroke:'currentColor',strokeWidth:'.06',...(char===':'?{strokeDasharray:'.14 .14',strokeDashoffset:n(boundaries[r]-top)}:{})}));
    }
   }
   const b=box(totalW+tagWidth,-top,top+totalH,svg,E('mtable',{columnspacing:gaps.slice(1,cols).map(x=>n(x)+'em').join(' '),rowspacing:rowAfter.slice(0,-1).map(x=>n(.3+x)+'em').join(' '),columnalign:ast.align.map(x=>({l:'left',r:'right',c:'center'}[x])).join(' ')},mml));
   const delim={pmatrix:['(',')'],bmatrix:['[',']'],Bmatrix:['{','}'],vmatrix:['|','|'],Vmatrix:['‖','‖'],cases:['{','.']}[ast.name];
   if(!delim){if(ast.name==='smallmatrix')return box(b.w*.7,b.h*.7,b.d*.7,move(b,0,0,.7),E('mstyle',{scriptlevel:1},b.mml));return b;}
   const l=fence(delim[0],b),r=fence(delim[1],b);return box(l.w+b.w+r.w,Math.max(b.h,l.h,r.h),Math.max(b.d,l.d,r.d),[l.svg,move(b,l.w),move(r,l.w+b.w)],E('mrow',null,E('mo',null,T(delim[0])),b.mml,E('mo',null,T(delim[1]==='.'?'':delim[1]))));
  }
  default:throw new VlxError('TEX','Unsupported syntax node '+ast.kind);
 }
}
return {layout,text,move,box};
}
const nodes=createLayout(require('./nodes.cjs')),markup=require('./markup.cjs'),strings=createLayout(markup);
const finish=b=>({...b,svg:markup.join(b.svg),mml:markup.join(b.mml)});
exports.layoutNodes=nodes.layout;
exports.layout=(...args)=>finish(strings.layout(...args));
exports.text=(...args)=>finish(strings.text(...args));
exports.move=strings.move;
exports.box=strings.box;
