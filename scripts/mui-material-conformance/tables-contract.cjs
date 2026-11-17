'use strict';process.env.NODE_ENV='production';
const assert=require('node:assert/strict'),{peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,r=peer('react-dom/server').renderToStaticMarkup,own=require(require('./prepare.cjs'));
function norm(html){return html.replace(/<style[\s\S]*?<\/style>/g,'').replace(/ class="([^"]*)"/g,(_,s)=>' class="'+s.split(' ').filter(c=>!c.startsWith('css-')).sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
function tree(M,{section='TableBody',size='medium',padding='normal',stickyHeader=false,align='inherit',sortDirection=false,custom=false,cell={}}){return h(M.TableContainer,{component:custom?'section':'div'},h(M.Table,{component:custom?'div':'table',size,padding,stickyHeader,'aria-label':'Scores'},h(M[section],{component:custom?'div':undefined},h(M.TableRow,{component:custom?'div':undefined,hover:true,selected:true},h(M.TableCell,{align,sortDirection,colSpan:2,...cell,classes:{root:'caller-cell'}},'Score')))));}
let checks=0;
for(const name of ['@mui/material','mui-material-app']){const up=peer(name);
 for(const section of ['TableHead','TableBody','TableFooter'])for(const size of ['small','medium'])for(const padding of ['normal','none','checkbox'])for(const stickyHeader of [false,true])for(const align of ['inherit','left','right','center','justify'])for(const sortDirection of [false,'asc','desc']){
 const p={section,size,padding,stickyHeader,align,sortDirection};assert.equal(norm(r(tree(own,p))),norm(r(tree(up,p))),name+JSON.stringify(p));checks++;
 }
 for(const section of ['TableHead','TableBody'])for(const custom of [false,true])for(const cell of [{component:'div'},{component:'th',scope:'row'},{component:'td',scope:'col'},{variant:'footer'},{padding:'none',size:'medium'},{'aria-sort':'other'}]){const p={section,custom,cell,size:'small',padding:'checkbox'};assert.equal(norm(r(tree(own,p))),norm(r(tree(up,p))),name+JSON.stringify(p));checks++;}
 for(const key of ['table','tableHead','tableBody','tableFooter','tableCell','tableRow','tableContainer'])assert.deepEqual(own[key+'Classes'],up[key+'Classes']);
 const theme=up.createTheme({components:{MuiTable:{defaultProps:{size:'small',stickyHeader:true}},MuiTableCell:{defaultProps:{align:'right'}}}});
 assert.equal(norm(r(h(own.ThemeProvider,{theme},tree(own,{})))),norm(r(h(up.ThemeProvider,{theme},tree(up,{})))));checks++;
}
console.log(checks+' Table primitive current/app semantic, context, state, root and default-prop comparisons pass');
