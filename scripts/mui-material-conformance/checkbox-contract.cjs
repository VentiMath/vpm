'use strict';
process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,own=require(require('./prepare.cjs'));
function norm(html,app=false){return html.replace(/<style[\s\S]*?<\/style>/g,'').replace(/<span class="MuiTouchRipple-root"[^>]*><\/span>/g,'').replace(app?/ (?:tabindex="-1"|aria-disabled="true")/g:/$^/g,'').replace(/ class="([^"]*)"/g,(_,s)=>' class="'+[...new Set(s.split(' ').filter(c=>!c.startsWith('css-')))].sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
let checks=0;
for(const version of ['@mui/material','mui-material-app']){
 const a=peer(version),app=version==='mui-material-app';
 for(const size of ['small','medium','large'])for(const color of ['primary','secondary','default'])for(const checked of [undefined,false,true])for(const indeterminate of [false,true])for(const disabled of [false,true])for(const edge of [false,'start','end']){
  const p={id:'check',name:'contest',value:'amc',size,color,checked,indeterminate,disabled,edge,slotProps:{input:{'aria-label':'Contest','aria-describedby':'help'}}};assert.equal(norm(r(h(own.Checkbox,p))),norm(r(h(a.Checkbox,p)),app),version+' Checkbox '+JSON.stringify(p));checks++;
 }
 for(const labelPlacement of ['start','end','top','bottom'])for(const disabled of [undefined,false,true])for(const required of [undefined,false,true])for(const disableTypography of [false,true])for(const context of [{},{disabled:true,error:true,required:true}]){
  const p={labelPlacement,disabled,required,disableTypography,label:h('b',null,'Contest')};
  const make=api=>h(api.FormControl,context,h(api.FormControlLabel,{...p,control:h(api.Checkbox,{defaultChecked:true})}));assert.equal(norm(r(make(own))),norm(r(make(a)),app),version+' FormControlLabel '+JSON.stringify(p));checks++;
 }
 for(const key of ['checkboxClasses','formControlLabelClasses']){const actual={...own[key]};if(app&&key==='formControlLabelClasses'){assert.equal(actual.labelPlacementEnd,'MuiFormControlLabel-labelPlacementEnd');delete actual.labelPlacementEnd;}assert.deepEqual(actual,a[key]);}
}
console.log(checks+' Checkbox/FormControlLabel SSR, state, native attributes and label comparisons pass current/app controls');
module.exports={norm};
