"use strict";
const assert=require('node:assert/strict'),base=require('./accordion-build.cjs');
function norm(s,legacy=false){if(legacy)s=s.replace(/\bMuiAccordionSummary-contentGutters\b/g,'');return s.replace(/<style[\s\S]*?<\/style>/g,'').replace(/ class="([^"]*)"/g,(_,v)=>' class="'+[...new Set(v.split(' ').filter(c=>c&&!/^(css|accord)/.test(c)))].sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,a)=>'<'+tag+[...a.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
let checks=0;
for (const version of ['current','app']) {
  const own=require(base+'/'+version+'-vpm/accordion-ssr.cjs');
  const upstream=require(base+'/'+version+'-upstream/accordion-ssr.cjs');
  assert.deepEqual(own.classes,upstream.classes);
  for (const kind of ['hmmt','warml','article']) for (const expanded of [undefined,true,false])
    for (const disabled of [false,true]) for (const square of [false,true]) for (const slots of [false,true])
      for (const unmount of [false,true]) {
        const p={kind,expanded,disabled,square,slots,unmount,named:!square};
        let actual=norm(own.render(p));
        const expected=norm(upstream.render(p),version==='app');
        // The Material 7 parent predates the region slot.
        if(version==='app' && slots && (!unmount || (expanded ?? (kind==='warml')))) {
          const attr=' data-expanded="'+String(expanded ?? (kind==='warml'))+'"';
          assert.ok(actual.includes(attr)); assert.ok(!expected.includes(attr));
          actual=actual.replace(attr,'');
        }
        assert.equal(actual,expected,version+JSON.stringify(p));
        checks++;
      }
}
console.log(checks+' Accordion parent SSR comparisons pass');
