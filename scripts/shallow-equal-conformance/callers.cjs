'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
if(!process.argv.includes('--child')){
 const results=['legacy','current','vpm'].map(name=>{const r=spawnSync(process.execPath,[__filename,'--child',name],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);});
 assert.deepEqual(results[1],results[0]);assert.deepEqual(results[2],results[0]);console.log('React Autosuggest: six actual lifecycle transitions and SSR match legacy 1.2.1/current 3.1.0/VPM.');
}else{
 const mode=process.argv.at(-1),api=mode==='vpm'?require('../../packages/vshallow-equal'):require(mode==='legacy'?'./node_modules/shallow-equal-legacy':'./node_modules/shallow-equal');
 const Module=require('node:module'),resolve=Module._resolveFilename;globalThis.__vpmShallowProbe={compare:api.shallowEqualArrays,calls:0};
 Module._resolveFilename=function(name,parent,...args){return resolve.call(this,name==='shallow-equal/arrays'?path.join(__dirname,'array-probe.cjs'):name,parent,...args)};
 const React=require('react'),{renderToString}=require('react-dom/server'),Autosuggest=require('react-autosuggest');
 const item={name:'alpha'},base={...Autosuggest.defaultProps,suggestions:[item],inputProps:{value:'a',onChange(){}},getSuggestionValue:x=>x.name,renderSuggestion:x=>React.createElement('span',null,x.name),onSuggestionsFetchRequested(){},onSuggestionsClearRequested(){}};
 const events=[];
 for(const [values,highlight]of [[base.suggestions,true],[[item],true],[[{name:'beta'}],true],[[],true],[[item],false],[[item],true]]){
  const props={...base,highlightFirstSuggestion:true},instance=new Autosuggest(props);instance.props=props;instance.state.highlightedSuggestionIndex=0;instance.highlightFirstSuggestion=()=>events.push('highlight');instance.resetHighlightedSuggestion=()=>events.push('reset');instance.revealSuggestions=()=>events.push('reveal');instance.willRenderSuggestions=()=>values.length>0;instance.UNSAFE_componentWillReceiveProps({...props,suggestions:values,highlightFirstSuggestion:highlight});
 }
 const html=renderToString(React.createElement(Autosuggest,{...base,alwaysRenderSuggestions:true,id:'fixture'}));assert.match(html,/role="combobox"/);assert.match(html,/alpha/);const comparisons=globalThis.__vpmShallowProbe.calls;assert.equal(comparisons,6);process.stdout.write(JSON.stringify({events,html,comparisons}));
}
