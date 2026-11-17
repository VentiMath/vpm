'use strict';
process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,own=require(require('./prepare.cjs'));
function norm(html){return html.replace(/<style[\s\S]*?<\/style>/g,'').replace(/ class="([^"]*)"/g,(_,s)=>' class="'+s.split(' ').filter(c=>!c.startsWith('css-')).sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
let checks=0;
for(const name of ['@mui/material','mui-material-app']){
 const upstream=peer(name);
 for(const raised of [false,true])for(const elevation of [undefined,0,2,24])for(const variant of ['elevation','outlined'])for(const square of [false,true])for(const component of ['div','article']){
  const props={raised,elevation,variant,square,component,classes:{root:'card'},sx:{p:2},children:'Results'};
  assert.equal(norm(r(h(own.Card,props))),norm(r(h(upstream.Card,props))),name+' '+JSON.stringify(props));checks++;
 }
 for(const defaults of [{},{MuiPaper:{defaultProps:{elevation:7,square:true}}},{MuiCard:{defaultProps:{raised:true}}}])for(const props of [{},{raised:true},{raised:true,elevation:0},{raised:true,elevation:undefined}]){
  const theme=upstream.createTheme({components:defaults});
  assert.equal(norm(r(h(own.ThemeProvider,{theme},h(own.Card,props,'Panel')))),norm(r(h(upstream.ThemeProvider,{theme},h(upstream.Card,props,'Panel')))));checks++;
 }
 for(const component of ['div','section'])for(const sx of [{},{p:0},{px:{xs:2,sm:3},'&:last-child':{pb:1}}]){
  const props={component,sx,classes:{root:'content'},children:h('button',null,'Open')};
  assert.equal(norm(r(h(own.CardContent,props))),norm(r(h(upstream.CardContent,props))));checks++;
 }
 assert.deepEqual(own.cardClasses,upstream.cardClasses);assert.deepEqual(own.cardContentClasses,upstream.cardContentClasses);
}
console.log(checks+' Card/CardContent SSR and theme-default comparisons pass current/app controls');
