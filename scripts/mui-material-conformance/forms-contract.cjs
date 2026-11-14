'use strict';
const assert=require('node:assert/strict');
const {peer}=require('./paths.cjs'),R=peer('react'),h=R.createElement,render=peer('react-dom/server').renderToStaticMarkup,own=require(require('./prepare.cjs'));
const normalize=html=>html.replace(/<style[\s\S]*?<\/style>/g,'').replace(/ class="([^"]*)"/g,(_,classes)=>' class="'+classes.split(' ').filter(c=>!c.startsWith('css-')).sort().join(' ')+'"').replace(/<([\w-]+)([^>]*)>/g,(_,tag,attrs)=>'<'+tag+[...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(x=>' '+x[1]+'="'+x[2]+'"').sort().join('')+'>');
function Input(){return null}Input.muiName='Input';function Select(){return null}Select.muiName='Select';
const seeds=[null,...[{value:0},{value:[]},{value:false},{value:''},{value:'x'},{defaultValue:'x'},{value:'',defaultValue:'x'},{inputProps:{value:0}},{inputProps:{defaultValue:'x'}},{startAdornment:'$'}].map(p=>h(Input,p)),h(Select,{input:h(Input,{value:'x',startAdornment:'$'})}),h('input',{defaultValue:'x'})];
let checks=0;
function renderTree(M,p,child,explicit){function Probe(){return h('output',null,JSON.stringify(M.useFormControl()));}return normalize(render(h(M.FormControl,p,h(M.FormLabel,{htmlFor:'contest',...explicit},'Contest'),child,h(M.FormHelperText,{id:'help',...explicit},' '),h(Probe))));}
for(const name of ['@mui/material','mui-material-app']){
 const control=peer(name);
 for(const disabled of [false,true])for(const error of [false,true])for(const focused of [undefined,false,true])for(const size of ['small','medium'])for(const variant of ['standard','outlined','filled'])for(const seed of seeds){
  const p={disabled,error,focused,size,variant,required:true,fullWidth:true,margin:'dense',color:'secondary'};
  assert.equal(renderTree(own,p,seed),renderTree(control,p,seed),name+' '+JSON.stringify(p));checks++;
 }
 for(const explicit of [{},{disabled:false,error:false,focused:false,filled:false,required:false},{required:true,filled:true},{component:'span',classes:{root:'app-root',filled:'app-filled',asterisk:'app-star'},className:'custom'}]){
  assert.equal(renderTree(own,{error:true,disabled:true,focused:true,required:true},null,explicit),renderTree(control,{error:true,disabled:true,focused:true,required:true},null,explicit));checks++;
 }
 for(const component of ['FormLabel','FormHelperText'])for(const child of [' ',null,'',0,'Help']){
  assert.equal(normalize(render(h(own[component],null,child))),normalize(render(h(control[component],null,child))));checks++;
 }
 for(const key of ['formControlClasses','formLabelClasses','formHelperTextClasses'])assert.deepEqual(own[key],control[key]);
}
console.log(checks+' form context, SSR state, explicit overrides, classes and accessibility comparisons pass current/app controls');
