'use strict';
const {VlxError}=require('./source.cjs');
const symbols={alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ϵ',varepsilon:'ε',zeta:'ζ',eta:'η',theta:'θ',vartheta:'ϑ',iota:'ι',kappa:'κ',lambda:'λ',mu:'μ',nu:'ν',xi:'ξ',pi:'π',rho:'ρ',sigma:'σ',tau:'τ',upsilon:'υ',phi:'ϕ',varphi:'φ',chi:'χ',psi:'ψ',omega:'ω',Gamma:'Γ',Delta:'Δ',Theta:'Θ',Lambda:'Λ',Xi:'Ξ',Pi:'Π',Sigma:'Σ',Phi:'Φ',Psi:'Ψ',Omega:'Ω',times:'×',div:'÷',pm:'±',mp:'∓',cdot:'⋅',circ:'∘',infty:'∞',le:'≤',leq:'≤',ge:'≥',geq:'≥',ne:'≠',neq:'≠',approx:'≈',equiv:'≡',in:'∈',notin:'∉',subset:'⊂',subseteq:'⊆',supset:'⊃',supseteq:'⊇',cup:'∪',cap:'∩',intersect:'∩',emptyset:'∅',forall:'∀',exists:'∃',neg:'¬',land:'∧',lor:'∨',to:'→',rightarrow:'→',leftarrow:'←',leftrightarrow:'↔',Rightarrow:'⇒',Leftarrow:'⇐',Leftrightarrow:'⇔',ldots:'…',cdots:'⋯',vdots:'⋮',ddots:'⋱',partial:'∂',nabla:'∇',angle:'∠',perp:'⊥',parallel:'∥',prime:'′',langle:'⟨',rangle:'⟩',lceil:'⌈',rceil:'⌉',lfloor:'⌊',rfloor:'⌋',vert:'|',Vert:'‖'};
Object.assign(symbols,{dots:'…',triangle:'△',ell:'ℓ',leqq:'≦',geqq:'≧',colon:':',bullet:'•',varnothing:'∅',mapsto:'↦',iff:'⇔',Longrightarrow:'⟹',Longleftrightarrow:'⟺',lnot:'¬',mid:'∣',subsetneq:'⊊',setminus:'∖','|':'‖'});
const fonts={mathrm:'normal',mathit:'italic',mathbf:'bold',mathbb:'double-struck',mathcal:'calligraphic',mathscr:'script',mathsf:'sans-serif',mathtt:'monospace'};
const functions='sin cos tan sec csc cot sinh cosh tanh log ln exp min max lim limsup liminf sup inf gcd det deg arcsin arccos arctan'.split(' ');
const decorations='boxed underline overline overarc arc overgroup bar vec overrightarrow overleftarrow overleftrightarrow hat widehat underbrace overbrace'.split(' ');
const classify=c=>/[=<>≤≥≠≈≡∈∉⊂⊆⊃⊇→←↔⇒⇐⇔⊥∥]/u.test(c)?'rel':/[+−×÷±∓⋅∪∩∧∨]/u.test(c)?'bin':/[([{⟨⌈⌊]/u.test(c)?'open':/[)\]}⟩⌉⌋]/u.test(c)?'close':/[,;:]/.test(c)?'punct':'ord';
function parseMath(source){
 if(typeof source!=='string')throw new TypeError('TeX must be a string');
 if(source.length>16384)throw new VlxError('LIMIT','At most 16384 TeX characters are supported');
 source=require('./macros.cjs').expand(source,new Set([...Object.keys(symbols),...Object.keys(fonts),...functions,...decorations,...'phantom hphantom vphantom binom dbinom tbinom textit textbf texttt textsc emph pmod bmod mod bigcup bigcap iint iiint tt rm bf it displaystyle textstyle scriptstyle scriptscriptstyle multicolumn over tag hspace makebox limits nolimits big bigl bigr bigm Big Bigl Bigr Bigm bigg biggl biggr biggm Bigg Biggl Biggr Biggm substack frac dfrac tfrac sqrt left right begin end text mbox operatorname mathrm mathit mathbf mathbb boxed underline overline overarc arc color textcolor enclose sum prod int sin cos tan log ln exp min max lim arcsin arccos arctan quad qquad'.split(' ')]));
 let i=0,count=0,depth=0,activeStop=()=>false;
 const fail=message=>{throw new VlxError('TEX',message,{start:i})};
 const node=value=>{if(++count>4096)throw new VlxError('LIMIT','Expression has too many nodes');return value};
 function skip(){while(i<source.length){if(/\s/.test(source[i]))i++;else if(source[i]==='%'){const end=source.indexOf('\n',i);i=end<0?source.length:end+1;}else break;}}
 function word(){i++;const match=/^[a-zA-Z]+/.exec(source.slice(i));if(match){i+=match[0].length;return match[0]}return source[i++]||'';}
 function raw(){skip();if(source[i]!=='{')fail('Expected a braced argument');const start=++i;let nesting=1;while(i<source.length){const c=source[i++];if(c==='\\'){i++;continue;}if(c==='{')nesting++;if(c==='}'&&!--nesting)return source.slice(start,i-1);}fail('Unclosed argument');}
 function group(){skip();if(++depth>64)throw new VlxError('LIMIT','Expression nesting exceeds 64 levels');try{if(source[i]!=='{')return atom(true);i++;const result=row(()=>source[i]==='}');if(source[i]!=='}')fail('Unclosed group');i++;return result;}finally{depth--;}}
 function delimiter(){skip();let c=source[i++];if(c==='\\'){i--;const name=word();c=symbols[name]||({'{':'{','}':'}','|':'‖'}[name]);}if(!c||!'()[]{}|‖⟨⟩⌈⌉⌊⌋.'.includes(c))fail('Unsupported delimiter');return c;}
 function dimension(value){
  const m=/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(em|ex|pt|mm|cm|in)$/.exec(value.trim());
  if(!m)fail('Unsupported dimension');const result=Number(m[1])*{em:1,ex:.43,pt:.1,mm:.28452756,cm:2.8452756,in:7.227}[m[2]];
  if(Math.abs(result)>64)throw new VlxError('LIMIT','Dimension exceeds 64em');return result;
 }
 function bracket(){skip();if(source[i]!=='[')return;const start=++i;while(i<source.length&&source[i]!==']')i++;if(source[i]!==']')fail('Unclosed optional argument');return source.slice(start,i++);}
 function table(name){
  const supported=['array','tabular','matrix','pmatrix','bmatrix','Bmatrix','vmatrix','Vmatrix','aligned','align','align*','gathered','gather','gather*','equation','equation*','smallmatrix','cases'];if(!supported.includes(name))fail('Unsupported environment '+name);
  let spec=['array','tabular'].includes(name)?raw():'';
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
  const spanOf=cell=>cell.kind==='row'&&cell.children.length===1&&cell.children[0].kind==='multicolumn'?cell.children[0].span:1;
  const columns=Math.max(...rows.map(r=>r.reduce((n,cell)=>n+spanOf(cell),0)));if(columns>32||rows.length>128)throw new VlxError('LIMIT','Array is too large');
  if(spec.replace(/[^lcr]/g,'').length!==columns&&['array','tabular'].includes(name))fail('Array cells must match the column specification');
  const align=spec?spec.replace(/[^lcr]/g,'').split(''):Array.from({length:columns},(_,c)=>/^align/.test(name)?(c%2?'l':'r'):name==='cases'?'l':'c');
  if(rows.some(r=>r.length>columns))fail('Too many array cells');
  return node({kind:'table',name,rows,align,spec,rules});
 }
 function atom(single=false){
  skip();const c=source[i];if(c===undefined)fail('Missing math argument');if(c==='{')return group();
  if(/[}\^_&#$]/.test(c))fail('Unexpected '+c);
  
  if(c==='~'){i++;return node({kind:'space',width:.333});}
  if(c==='\\'){
   const command=word();
   if(Object.hasOwn(symbols,command))return node({kind:'symbol',text:symbols[command],class:classify(symbols[command])});
   if(['binom','dbinom','tbinom'].includes(command))return node({kind:'binomial',numerator:group(),denominator:group(),style:command});
   if(['frac','dfrac','tfrac'].includes(command))return node({kind:'fraction',numerator:group(),denominator:group(),style:command});
   if(command==='sqrt'){skip();let index;if(source[i]==='['){i++;index=row(()=>source[i]===']');if(source[i]!==']')fail('Unclosed root index');i++;}return node({kind:'root',body:group(),index});}
   if(command==='left'){const left=delimiter();const body=row(()=>source.startsWith('\\right',i));if(!source.startsWith('\\right',i))fail('Missing right delimiter');i+=6;return node({kind:'fenced',left,right:delimiter(),body});}
   if(command==='begin')return table(raw());
   if(command==='hspace')return node({kind:'space',width:dimension(raw())});
   if(command==='makebox'){const width=bracket(),align=width===undefined?'c':bracket()||'c';if(!['l','c','r'].includes(align))fail('Unsupported box alignment');return node({kind:'fixedbox',width:width===undefined?undefined:dimension(width),align,body:textGroup()});}
   if(command==='tag'){let star=false;if(source[i]==='*'){star=true;i++;}return node({kind:'tag',star,body:textGroup()});}
   if(command==='multicolumn'){const span=Number(raw()),spec=raw();if(!Number.isSafeInteger(span)||span<1||span>32||!/^[:|]*[lcr][:|]*$/.test(spec))fail('Invalid multicolumn');return node({kind:'multicolumn',span,spec,body:group()});}

   if(['text','mbox','textit','textbf','texttt','textsc','emph'].includes(command))return textGroup({textit:'italic',emph:'italic',textbf:'bold',texttt:'monospace',textsc:'small-caps'}[command]);
   if(command==='operatorname'){let limits=false;if(source[i]==='*'){i++;limits=true;}return node({kind:'operator',body:textGroup(),limits});}
   if(Object.hasOwn(fonts,command))return node({kind:'font',font:command,body:group()});
   if(decorations.includes(command))return node({kind:'decoration',limits:command==='underbrace'||command==='overbrace',alwaysLimits:command==='underbrace'||command==='overbrace',style:{arc:'overarc',overgroup:'overarc',bar:'overline',vec:'overrightarrow',hat:'widehat'}[command]||command,body:group()});
   if(['phantom','hphantom','vphantom'].includes(command))return node({kind:'phantom',mode:command,body:group()});
   if(['color','textcolor'].includes(command)){const color=raw();if(!/^(?:black|white|red|blue|green|gray|orange|purple|#[a-fA-F0-9]{3}|#[a-fA-F0-9]{6})$/.test(color))fail('Unsupported color');return node({kind:'color',color,body:command==='textcolor'?group():row(activeStop)});}
   if(['tt','rm','bf','it'].includes(command))return node({kind:'font',font:{tt:'mathtt',rm:'mathrm',bf:'mathbf',it:'mathit'}[command],body:row(activeStop)});
   if(['displaystyle','textstyle','scriptstyle','scriptscriptstyle'].includes(command))return node({kind:'style',style:command,body:row(activeStop)});
   if(/^(?:big|Big|bigg|Bigg)[lrm]?$/.test(command))return node({kind:'delimiter',text:delimiter(),size:command.startsWith('Bigg')?3:command.startsWith('bigg')?2.4:command.startsWith('Big')?1.8:1.2});
   if(command==='pmod'){const body=node({kind:'row',children:[node({kind:'text',text:'mod'}),node({kind:'space',width:.333}),group()]});return node({kind:'row',children:[node({kind:'space',width:1}),node({kind:'fenced',left:'(',right:')',body})]});}
   if(command==='mod'||command==='bmod'){const children=[node({kind:'space',width:command==='bmod'?.222:1}),node({kind:'text',text:'mod',operator:command==='bmod'})];if(command!=='bmod')children.push(node({kind:'space',width:.333}),group());const body=node({kind:'row',children});return command==='pmod'?node({kind:'fenced',left:'(',right:')',body}):body;}
   if(command==='mathop')return node({kind:'operator',body:group(),limits:true});
   if(command==='substack'){skip();if(source[i]!=='{')fail('Expected a braced argument');i++;const rows=[];while(true){rows.push([row(()=>source[i]==='}'||source.startsWith('\\\\',i))]);if(source[i]==='}'){i++;break;}if(!source.startsWith('\\\\',i))fail('Unclosed substack');i+=2;}return node({kind:'table',name:'smallmatrix',rows,align:['c'],spec:'',rules:[]});}
   if(command==='enclose'){const shape=raw();if(shape!=='circle'&&shape!=='box')fail('Unsupported enclosure');return node({kind:'decoration',style:shape==='box'?'boxed':'circle',body:group()});}
   if(['sum','prod','int','iint','iiint','bigcup','bigcap'].includes(command))return node({kind:'symbol',text:{sum:'∑',prod:'∏',int:'∫',iint:'∬',iiint:'∭',bigcup:'⋃',bigcap:'⋂'}[command],class:'op',large:true,limits:!command.endsWith('int')});
   if(functions.includes(command))return node({kind:'text',text:command.replace(/(lim)(sup|inf)/,'$1 $2'),operator:true,limits:['lim','limsup','liminf','min','max','sup','inf'].includes(command)});
   if(Object.hasOwn({',':.167,':':.222,';':.278,'!':-.167,' ': .333,quad:1,qquad:2},command))return node({kind:'space',width:{',':.167,':':.222,';':.278,'!':-.167,' ': .333,quad:1,qquad:2}[command]});
   if('{}$%_#&'.includes(command)&&command.length===1)return node({kind:'symbol',text:command,class:classify(command)});
   fail('Unsupported command \\'+command);
  }
  if(/[0-9]/.test(c)){const start=i++;if(!single){while(/[0-9]/.test(source[i]||'\0'))i++;if(source[i]==='.'&&/[0-9]/.test(source[i+1]||'\0')){i++;while(/[0-9]/.test(source[i]||'\0'))i++;}}return node({kind:'number',text:source.slice(start,i)})}
  const text=c==='-'?'−':String.fromCodePoint(source.codePointAt(i));i+=text.length===2?2:1;return node({kind:'symbol',text,class:classify(text)});
 }
 function textGroup(font){
  skip();if(source[i]!=='{')fail('Expected a braced text argument');i++;
  if(++depth>64)throw new VlxError('LIMIT','Expression nesting exceeds 64 levels');
  const children=[];let value='';
  const flush=()=>{if(value){children.push(node({kind:'text',text:value,font}));value='';}};
  while(i<source.length&&source[i]!=='}'){
   const c=source[i];
   if(c==='{'){flush();children.push(textGroup(font));continue;}
   if(c==='$'){flush();i++;children.push(row(()=>source[i]==='$'));if(source[i]!=='$')fail('Unclosed text math');i++;continue;}
   if(c==='\\'){
    flush();const command=word();
    if(['text','mbox','textit','textbf','emph','texttt','textsc'].includes(command)){children.push(textGroup({textit:'italic',emph:'italic',textbf:'bold',texttt:'monospace',textsc:'small-caps'}[command]||font));continue;}
    if('{}$%_#&\\'.includes(command)&&command.length===1){value+=command;continue;}
    if(command==='ldots'||command==='dots'){value+='…';continue;}
    fail('Unsupported text command \\'+command);
   }
   value+=c==='~'?' ':c;i++;
  }
  if(source[i]!=='}')fail('Unclosed text argument');i++;flush();depth--;
  return node({kind:'textrow',children});
 }
 function scripted(){
  let base=source[i]==='^'||source[i]==='_'?node({kind:'row',children:[]}):atom(),sup,sub,prime=false;
  while(true){
   skip();
   if(source.startsWith('\\limits',i)||source.startsWith('\\nolimits',i)){const command=word();base={...base,limits:command==='limits'};continue;}
   if(source[i]==="'"){
    if(sup&&!prime)fail('Duplicate superscript');const children=sup?sup.children:[];
    while(source[i]==="'"){i++;children.push(node({kind:'symbol',text:'′',class:'ord'}));}sup=node({kind:'row',children});prime=true;continue;
   }
   if(source[i]!=='^'&&source[i]!=='_')break;
   const type=source[i++];if(type==='^'){if(sup&&!prime)fail('Duplicate superscript');const value=group();sup=prime?node({kind:'row',children:[sup,value]}):value;prime=false;}else{if(sub)fail('Duplicate subscript');sub=group();}
  }
  return sup||sub?node({kind:'scripts',base,sup,sub}):base;
 }
 function row(stop=()=>false,overAllowed=true){
  if(++depth>64)throw new VlxError('LIMIT','Expression nesting exceeds 64 levels');
  const previous=activeStop;activeStop=stop;const children=[];
  try{while(true){skip();if(i>=source.length||stop())break;
    if(/^\\over(?![A-Za-z])/.test(source.slice(i))){if(!overAllowed)fail('Duplicate infix fraction');i+=5;const numerator=node({kind:'row',children});return node({kind:'fraction',numerator,denominator:row(stop,false),style:'frac'});}
    children.push(scripted());}return node({kind:'row',children});}finally{depth--;activeStop=previous;}
 }
 const result=row();if(i!==source.length)fail('Unexpected trailing input');return result;
}
exports.parseMath=parseMath;
