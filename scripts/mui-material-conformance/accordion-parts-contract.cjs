"use strict";
const assert=require('node:assert/strict'),base=require('./accordion-parts-build.cjs');
function norm(s,legacy=false){if(legacy)s=s.replace(/\bMuiAccordionSummary-contentGutters\b/g,'');return s.replace(/<style[\s\S]*?<\/style>/g,'').replace(/ class="([^"]*)"/g,(_,v)=>' class="'+[...new Set(v.split(' ').filter(c=>c&&!/^(css|accord)/.test(c)))].sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,a)=>'<'+tag+[...a.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
let checks=0;
for(const version of ['current','app']){const U=require(base+'/'+version+'-upstream/accordion-parts-ssr.cjs'),V=require(base+'/'+version+'-vpm/accordion-parts-ssr.cjs');const uc={...U.classes};if(version==='app'){assert.equal(uc.contentGutters,'MuiAccordionSummary-contentGutters');delete uc.contentGutters;}assert.deepEqual(V.classes,uc);assert.deepEqual(V.detailClasses,U.detailClasses);
 for(const expanded of [false,true])for(const disabled of [false,true])for(const disableGutters of [false,true])for(const icon of [false,true])for(const slots of [false,true])for(const component of ['button','div']){const p={expanded,disabled,disableGutters,icon,slots,component};const a=U.render(p),b=V.render(p);if(version==='app')assert.equal(a.includes('MuiAccordionSummary-contentGutters'),!disableGutters);assert.equal(norm(b),norm(a,version==='app'),version+JSON.stringify(p));checks++;}
 for(const p of [{standalone:true},{custom:true},{app:true},{mode:'dark',variables:true},{rtl:true}]){assert.equal(norm(V.render(p)),norm(U.render(p),version==='app'),version+JSON.stringify(p));checks++;}
}
console.log(checks+' Accordion summary/details current/app markup, state, slots and classes comparisons pass; legacy contentGutters is explicitly accounted for');
