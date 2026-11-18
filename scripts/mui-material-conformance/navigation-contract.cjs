'use strict';process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,M=require(require('./prepare.cjs'));
const norm=html=>html.replace(/<style[\s\S]*?<\/style>/g,'').replace(/<span[^>]*class="MuiTouchRipple-root"[^>]*><\/span>/g,'').replace(/<path[^>]*><\/path>/g,'<path></path>').replace(/ data-testid="[^"]*"/g,'').replace(/ class="([^"]*)"/g,(_,s)=>' class="'+s.split(' ').filter(c=>!c.startsWith('css-')&&!/^MuiTableSortLabel-iconDirection|^MuiPaginationItem-(text|outlined)(Primary|Secondary)$/.test(c)).sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');
let checks=0;
for(const upstream of ['@mui/material','mui-material-app']){
 const U=peer(upstream);
 for(const active of [false,true])for(const direction of ['asc','desc'])for(const hideSortIcon of [false,true])for(const disabled of [false,true])for(const component of ['span','button','a']){
  const props={active,direction,hideSortIcon,disabled,component,children:'Contest',...(component==='a'?{href:'#contest'}:{})};assert.equal(norm(r(h(M.TableSortLabel,props))),norm(r(h(U.TableSortLabel,props))),upstream+JSON.stringify(props));checks++;
 }
 for(const count of [0,1,2,3,5,7,8,9,10,20,100,1000000])for(const page of [1,2,4,Math.max(1,count-1),Math.max(1,count)])for(const boundaryCount of [0,1,2,3])for(const siblingCount of [0,1,2]){
  const props={count,page,boundaryCount,siblingCount,showFirstButton:page%2===0,showLastButton:true};
  const get=lib=>{let result;function C(){result=lib.usePagination(props).items.map(({onClick,...rest})=>rest);return null}r(h(C));return JSON.parse(JSON.stringify(result));};
  assert.deepEqual(get(M),get(U),upstream+JSON.stringify(props));checks++;
 }
 for(const type of ['page','previous','next','first','last','start-ellipsis','end-ellipsis'])for(const selected of [false,true])for(const disabled of [false,true])for(const size of ['small','medium','large'])for(const variant of ['text','outlined'])for(const color of ['standard','primary','secondary']){
  const props={type,page:2,selected,disabled,size,variant,color,shape:'rounded'};assert.equal(norm(r(h(M.PaginationItem,props))),norm(r(h(U.PaginationItem,props))),upstream+JSON.stringify(props));checks++;
 }
 for(const disabled of [false,true])for(const variant of ['text','outlined']){
  const props={count:10,page:5,disabled,variant,color:'secondary',shape:'rounded',showFirstButton:true,showLastButton:true};assert.equal(norm(r(h(M.Pagination,props))),norm(r(h(U.Pagination,props))),upstream+JSON.stringify(props));checks++;
 }
 if(upstream==='@mui/material')for(const name of ['tableSortLabel','pagination','paginationItem'])assert.deepEqual(M[name+'Classes'],U[name+'Classes']);
}
console.log(checks+' current/app sort-label, page-window, item and navigation comparisons pass');
