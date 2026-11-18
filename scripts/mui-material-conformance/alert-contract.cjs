'use strict';process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,M=require(require('./prepare.cjs'));
function norm(html){return html.replace(/<span[^>]*class="MuiTouchRipple-root"[^>]*><\/span>/g,'').replace(/<style[\s\S]*?<\/style>/g,'').replace(/(<svg[^>]*>)[\s\S]*?<\/svg>/g,'$1</svg>').replace(/ class="([^"]*)"/g,(_,s)=>{const c=s.split(' ').filter(c=>c&&!c.startsWith('css-')&&!/^MuiAlert-(?:filled|standard|outlined)(?:Success|Info|Warning|Error|Contest)$/.test(c)).sort();return c.length?' class="'+c.join(' ')+'"':''}).replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
let checked=0;
for(const name of ['@mui/material','mui-material-app']){
 const U=peer(name),styles=peer(name+'/styles');
 for(const severity of ['success','info','warning','error'])for(const variant of ['standard','outlined','filled'])for(const mode of ['light','dark'])for(const content of ['message','title','close','action','no-icon','mapped']){
  const theme=styles.createTheme({palette:{mode}}),props={severity,variant,'aria-label':'Practice feedback',...(content==='close'?{onClose:()=>{},closeText:'Dismiss'}:content==='action'?{action:h('button',null,'Retry')}:content==='no-icon'?{icon:false}:content==='mapped'?{iconMapping:{[severity]:h('b',null,'!')}}:{})};
  const render=X=>r(h(X.ThemeProvider,{theme},h(X.Alert,props,content==='title'?h(X.AlertTitle,null,'Capacity'):null,'Message')));
  assert.equal(norm(render(M)),norm(render(U)),JSON.stringify({name,severity,variant,mode,content}));checked++;
 }
 for(const props of [{color:'error',severity:'success'}, {icon:null}, {icon:0}, {action:0,onClose:()=>{}}, {action:false,onClose:()=>{}}, {component:'section',role:'status',square:true,elevation:2}, {classes:{root:'custom',message:'msg'},sx:{mb:2}}, {slotProps:{root:{style:{padding:1},className:'root-slot'},message:s=>({'data-severity':s.severity})}}]){assert.equal(norm(r(h(M.Alert,props,'Message'))),norm(r(h(U.Alert,props,'Message'))),name+JSON.stringify(props));checked++;}
 if(name==='@mui/material'){
  assert.deepEqual(M.alertClasses,U.alertClasses);assert.deepEqual(M.alertTitleClasses,U.alertTitleClasses);
  for(const props of [{slots:{root:'section',icon:'aside',message:'p',action:'footer',closeButton:'button',closeIcon:'i'},onClose:()=>{}},{slots:{message:'p'},slotProps:{message:{title:'Text'}},icon:false}]){assert.equal(norm(r(h(M.Alert,props,'Message'))),norm(r(h(U.Alert,props,'Message'))),'current slots');checked++;}
 }
 const theme=styles.createTheme({components:{MuiAlert:{defaultProps:{severity:'warning',variant:'filled',icon:false}},MuiAlertTitle:{defaultProps:{component:'h3'}}}});
 assert.equal(norm(r(h(M.ThemeProvider,{theme},h(M.Alert,null,h(M.AlertTitle,null,'Title'))))),norm(r(h(U.ThemeProvider,{theme},h(U.Alert,null,h(U.AlertTitle,null,'Title'))))));checked++;
}
console.log(checked+' current/app Alert and AlertTitle semantics, variants, actions, defaults and slot comparisons pass; original SVG geometry and existing SSR ripple placeholder excluded explicitly');
