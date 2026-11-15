'use strict';
const assert=require('node:assert/strict');
const {peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,render=peer('react-dom/server').renderToStaticMarkup,own=require(require('./prepare.cjs'));
const legacy=['inputSizeSmall','inputMultiline','inputAdornedStart','inputAdornedEnd','inputHiddenLabel'].map(s=>'MuiInputBase-'+s);
function normalize(html){return html.replace(/<style[\s\S]*?<\/style>/g,'').replace(/<textarea aria-hidden="true"[\s\S]*?<\/textarea>/g,'').replace(/ class="([^"]*)"/g,(_,s)=>' class="'+s.split(' ').filter(c=>!c.startsWith('css-')&&!legacy.includes(c)).sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');}
const cases=[];
for(const disabled of [undefined,false,true])for(const error of [undefined,false,true])for(const size of [undefined,'small','medium'])for(const multiline of [false,true])for(const value of [undefined,'',0,'Contest\nRound'])cases.push({disabled,error,size,multiline,defaultValue:value});
cases.push(...[{required:true,readOnly:true},{inputProps:{disabled:false,required:false,readOnly:false,type:'number'},disabled:true,required:true,readOnly:true},{inputProps:{value:'inner'},value:'outer',onChange(){}},{slotProps:{root:{id:'root'},input:{id:'slot'}},inputProps:{id:'prop'},id:'outer'},{multiline:true,rows:4},{multiline:true,minRows:2,maxRows:4},{startAdornment:'$',endAdornment:'kg',fullWidth:true},{type:'search',autoComplete:'off',inputProps:{'aria-label':'Search'}},{id:'name','aria-describedby':'helper',name:'contest',placeholder:'Name'},{slots:{root:'section',input:'input'},inputProps:{title:'Slot'},className:'app',classes:{root:'root',input:'input'}}]);
let checks=0;
for(const pkg of ['@mui/material','mui-material-app']){const control=peer(pkg);for(const props of cases)for(const parent of [false,true]){
 const draw=M=>{let html=render(parent?h(M.FormControl,{error:true,required:true,size:'small',color:'secondary'},h(M.InputBase,props)):h(M.InputBase,props));if(props.slots?.root==='section'){if(M===control)assert.match(html,/classes="\[object Object\]"/);else assert.doesNotMatch(html,/ classes=/);html=html.replace(/ classes="\[object Object\]"/,'');}return normalize(html);};
 assert.equal(draw(own),draw(control),pkg+' '+JSON.stringify(props)+' parent='+parent);checks++;
}
// Current Material puts aria-label on the actual control. App 7 put it on the
// wrapper, leaving a native textbox unnamed. Verify the difference explicitly.
const newer=normalize(render(h(own.InputBase,{'aria-label':'Contest'}))),older=normalize(render(h(control.InputBase,{'aria-label':'Contest'})));
assert.match(newer,/<input[^>]*aria-label="Contest"/);
if(pkg==='@mui/material')assert.equal(newer,older);else assert.match(older,/<div[^>]*aria-label="Contest"/);
}
console.log(checks+' InputBase visible SSR/native-attribute comparisons pass; current input ARIA placement and legacy control differences asserted');
