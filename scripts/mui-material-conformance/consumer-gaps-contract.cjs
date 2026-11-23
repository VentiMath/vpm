'use strict';
const assert=require('node:assert/strict'),base=require('./consumer-gaps-build.cjs');
let checks=0;
for(const version of ['app','current']){
 const control=require(base+'/'+version+'-upstream/consumer-gaps-ssr.cjs'),own=require(base+'/'+version+'-vpm/consumer-gaps-ssr.cjs');
 for(const count of [-1,0,1,27,100])for(const rows of [-1,10,25])for(const page of [0,1]){
  const props={kind:'pagination',count,rows,page};
  const label=html=>html.match(/<p[^>]*class="[^"]*MuiTablePagination-displayedRows[^>]*>(.*?)<\/p>/)?.[1];
  assert.equal(label(own.render(props)),label(control.render(props)),JSON.stringify(props));checks++;
 }
 for(const kind of ['fade','focus','auto'])for(const open of [true,false]){
  const html=own.render({kind,open});assert.ok(html.includes(kind==='auto'?'combobox':kind==='focus'?'sentinelStart':'Preview'));checks++;
 }
}
console.log(checks+' consumer-gap SSR contracts pass');
