'use strict';
const {VlxError}=require('./source.cjs');
const symbols={alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ϵ',varepsilon:'ε',zeta:'ζ',eta:'η',theta:'θ',vartheta:'ϑ',iota:'ι',kappa:'κ',lambda:'λ',mu:'μ',nu:'ν',xi:'ξ',pi:'π',rho:'ρ',sigma:'σ',tau:'τ',upsilon:'υ',phi:'ϕ',varphi:'φ',chi:'χ',psi:'ψ',omega:'ω',Gamma:'Γ',Delta:'Δ',Theta:'Θ',Lambda:'Λ',Xi:'Ξ',Pi:'Π',Sigma:'Σ',Phi:'Φ',Psi:'Ψ',Omega:'Ω',times:'×',div:'÷',pm:'±',mp:'∓',cdot:'⋅',circ:'∘',infty:'∞',le:'≤',leq:'≤',ge:'≥',geq:'≥',ne:'≠',neq:'≠',approx:'≈',equiv:'≡',in:'∈',notin:'∉',subset:'⊂',subseteq:'⊆',supset:'⊃',supseteq:'⊇',cup:'∪',cap:'∩',intersect:'∩',emptyset:'∅',forall:'∀',exists:'∃',neg:'¬',land:'∧',lor:'∨',to:'→',rightarrow:'→',leftarrow:'←',leftrightarrow:'↔',Rightarrow:'⇒',Leftarrow:'⇐',Leftrightarrow:'⇔',ldots:'…',cdots:'⋯',vdots:'⋮',ddots:'⋱',partial:'∂',nabla:'∇',angle:'∠',perp:'⊥',parallel:'∥',prime:'′',langle:'⟨',rangle:'⟩',lceil:'⌈',rceil:'⌉',lfloor:'⌊',rfloor:'⌋',vert:'|',Vert:'‖'};
const classify=c=>/[=<>≤≥≠≈≡∈∉⊂⊆⊃⊇→←↔⇒⇐⇔⊥∥]/u.test(c)?'rel':/[+−×÷±∓⋅∪∩∧∨]/u.test(c)?'bin':/[([{⟨⌈⌊]/u.test(c)?'open':/[)\]}⟩⌉⌋]/u.test(c)?'close':/[,;:]/.test(c)?'punct':'ord';
function parseMath(source){
 if(typeof source!=='string')throw new TypeError('TeX must be a string');
 if(source.length>16384)throw new VlxError('LIMIT','At most 16384 TeX characters are supported');
 source=require('./macros.cjs').expand(source,new Set([...Object.keys(symbols),...'frac dfrac tfrac sqrt left right begin end text mbox operatorname mathrm mathit mathbf mathbb boxed underline overline overarc arc color textcolor enclose sum prod int sin cos tan log ln exp min max lim arcsin arccos arctan quad qquad'.split(' ')]));
 let i=0,count=0,depth=0;
 const fail=message=>{throw new VlxError('TEX',message,{start:i})};
 const node=value=>{if(++count>4096)throw new VlxError('LIMIT','Expression has too many nodes');return value};
 function skip(){while(i<source.length){if(/\s/.test(source[i]))i++;else if(source[i]==='%'){const end=source.indexOf('\n',i);i=end<0?source.length:end+1;}else break;}}
 function word(){i++;const match=/^[a-zA-Z]+/.exec(source.slice(i));if(match){i+=match[0].length;return match[0]}return source[i++]||'';}
 function raw(){skip();if(source[i]!=='{')fail('Expected a braced argument');const start=++i;let nesting=1;while(i<source.length){const c=source[i++];if(c==='\\'){i++;continue;}if(c==='{')nesting++;if(c==='}'&&!--nesting)return source.slice(start,i-1);}fail('Unclosed argument');}
 function group(){skip();if(++depth>64)throw new VlxError('LIMIT','Expression nesting exceeds 64 levels');try{if(source[i]!=='{')return atom(true);i++;const result=row(()=>source[i]==='}');if(source[i]!=='}')fail('Unclosed group');i++;return result;}finally{depth--;}}
 function delimiter(){skip();let c=source[i++];if(c==='\\'){i--;const name=word();c=symbols[name]||({'{':'{','}':'}','|':'‖'}[name]);}if(!c||!'()[]{}|‖⟨⟩⌈⌉⌊⌋.'.includes(c))fail('Unsupported delimiter');return c;}
 function table(name){
  const supported=['array','matrix','pmatrix','bmatrix','Bmatrix','vmatrix','Vmatrix','aligned','cases'];if(!supported.includes(name))fail('Unsupported environment '+name);
  let spec=name==='array'?raw():'';
  if(spec&&!/^[lcr|: ]+$/.test(spec))fail('Unsupported array column specification');
  const rows=[],rules=[];let cells=[];
  while(true){skip();if(source.startsWith('\\hline',i)||source.startsWith('\\hdashline',i)){if(cells.length)fail('Array rules must appear between rows');const dashed=source.startsWith('\\hdashline',i);i+=dashed?10:6;rules.push({row:rows.length,dashed});continue;}
   if(source.startsWith('\\end',i)){i+=4;const end=raw();if(end!==name)fail('Mismatched environment '+end);if(cells.length)rows.push(cells);break;}
   if(i>=source.length)fail('Unclosed environment '+name);
   cells.push(row(()=>source[i]==='&'||source.startsWith('\\\\',i)||source.startsWith('\\end',i)));
   if(source[i]==='&'){i++;continue;}
   if(source.startsWith('\\\\',i)){i+=2;rows.push(cells);cells=[];continue;}
   if(!source.startsWith('\\end',i))fail('Expected an array separator');
  }
  if(!rows.length)fail('Empty arrays are not supported');
  const columns=Math.max(...rows.map(r=>r.length));if(columns>32||rows.length>128)throw new VlxError('LIMIT','Array is too large');
  if(spec.replace(/[^lcr]/g,'').length!==columns&&name==='array')fail('Array cells must match the column specification');
  const align=spec?spec.replace(/[^lcr]/g,'').split(''):Array.from({length:columns},(_,c)=>name==='aligned'?(c%2?'l':'r'):name==='cases'?'l':'c');
  if(rows.some(r=>r.length>columns))fail('Too many array cells');
  return node({kind:'table',name,rows,align,spec,rules});
 }
 function atom(single=false){
  skip();const c=source[i];if(c===undefined)fail('Missing math argument');if(c==='{')return group();
  if(/[}\^_&#$]/.test(c))fail('Unexpected '+c);
  if(c==="'")fail('Literal prime notation is not supported yet; use a superscript with \\prime');
  if(c==='~'){i++;return node({kind:'space',width:.333});}
  if(c==='\\'){
   const command=word();
   if(Object.hasOwn(symbols,command))return node({kind:'symbol',text:symbols[command],class:classify(symbols[command])});
   if(['frac','dfrac','tfrac'].includes(command))return node({kind:'fraction',numerator:group(),denominator:group(),style:command});
   if(command==='sqrt'){skip();let index;if(source[i]==='['){i++;index=row(()=>source[i]===']');if(source[i]!==']')fail('Unclosed root index');i++;}return node({kind:'root',body:group(),index});}
   if(command==='left'){const left=delimiter();const body=row(()=>source.startsWith('\\right',i));if(!source.startsWith('\\right',i))fail('Missing right delimiter');i+=6;return node({kind:'fenced',left,right:delimiter(),body});}
   if(command==='begin')return table(raw());
   if(['text','mbox','operatorname'].includes(command)){const value=raw();if(/\\(?![{}$%_#&\\])|(?<!\\)[{}]/.test(value))fail('Nested text commands are not supported yet');const text=value.replace(/\\([{}$%_#&\\])/g,'$1');return node({kind:'text',text,operator:command==='operatorname'});}
   if(['mathrm','mathit','mathbf','mathbb'].includes(command))return node({kind:'font',font:command,body:group()});
   if(['boxed','underline','overline','overarc','arc'].includes(command))return node({kind:'decoration',style:command==='arc'?'overarc':command,body:group()});
   if(['color','textcolor'].includes(command)){const color=raw();if(!/^(?:black|white|red|blue|green|gray|orange|purple|#[a-fA-F0-9]{3}|#[a-fA-F0-9]{6})$/.test(color))fail('Unsupported color');skip();if(source[i]!=='{')fail('Color needs an explicit braced body');return node({kind:'color',color,body:group()});}
   if(command==='enclose'){const shape=raw();if(shape!=='circle'&&shape!=='box')fail('Unsupported enclosure');return node({kind:'decoration',style:shape==='box'?'boxed':'circle',body:group()});}
   if(['sum','prod','int'].includes(command))return node({kind:'symbol',text:{sum:'∑',prod:'∏',int:'∫'}[command],class:'op',large:true,limits:command!=='int'});
   if(['sin','cos','tan','log','ln','exp','min','max','lim','arcsin','arccos','arctan'].includes(command))return node({kind:'text',text:command,operator:true});
   if(Object.hasOwn({',':.167,':':.222,';':.278,'!':-.167,' ': .333,quad:1,qquad:2},command))return node({kind:'space',width:{',':.167,':':.222,';':.278,'!':-.167,' ': .333,quad:1,qquad:2}[command]});
   if('{}$%_#&'.includes(command)&&command.length===1)return node({kind:'symbol',text:command,class:classify(command)});
   fail('Unsupported command \\'+command);
  }
  if(/[0-9]/.test(c)){const start=i++;if(!single){while(/[0-9]/.test(source[i]||'\0'))i++;if(source[i]==='.'&&/[0-9]/.test(source[i+1]||'\0')){i++;while(/[0-9]/.test(source[i]||'\0'))i++;}}return node({kind:'number',text:source.slice(start,i)})}
  const text=c==='-'?'−':String.fromCodePoint(source.codePointAt(i));i+=text.length===2?2:1;return node({kind:'symbol',text,class:classify(text)});
 }
 function scripted(){let base=atom(),sup,sub;while(true){skip();if(source[i]!=='^'&&source[i]!=='_')break;const type=source[i++];if(type==='^'){if(sup)fail('Duplicate superscript');sup=group();}else{if(sub)fail('Duplicate subscript');sub=group();}}return sup||sub?node({kind:'scripts',base,sup,sub}):base;}
 function row(stop=()=>false){if(++depth>64)throw new VlxError('LIMIT','Expression nesting exceeds 64 levels');const children=[];while(true){skip();if(i>=source.length||stop())break;children.push(scripted());}depth--;return node({kind:'row',children});}
 const result=row();if(i!==source.length)fail('Unexpected trailing input');return result;
}
exports.parseMath=parseMath;
