'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
if(!process.argv.includes('--child')) {
 const runs=['upstream','vpm'].map(variant=>{const r=spawnSync(process.execPath,[__filename,'--child',variant],{encoding:'utf8',timeout:60000});assert.equal(r.status,0,r.stdout+r.stderr);return JSON.parse(r.stdout);});
 assert.deepEqual(runs[1],runs[0]);assert.ok(runs[1].calls.isFragment>0);assert.ok(runs[1].calls.isValidElementType>0);
 console.log(`MUI: ${runs[0].html.length} SSR cases, actual deepmerge/display-name consumers and ${JSON.stringify(runs[0].calls)} match.`);
} else {
 const vpm=process.argv.at(-1)==='vpm',calls={};
 const paths=['react-is','@mui/material/MenuList','@mui/utils/deepmerge'].map(name=>require.resolve(name,{paths:[path.join(__dirname,'node_modules')]}));
 const resolved=new Set(paths.map(file=>require.resolve('react-is',{paths:[path.dirname(file)]})));
 for(const file of resolved) {const original=require(file),api=vpm?require('../../packages/vreact-is'):original,wrapped={...api};for(const name of Object.keys(api))if(typeof api[name]==='function')wrapped[name]=(...args)=>{calls[name]=(calls[name]||0)+1;return api[name](...args);};require.cache[file].exports=wrapped;}
 const React=require('./node_modules/react'),{renderToStaticMarkup}=require('./node_modules/react-dom/server');
 const {MenuList,MenuItem,ToggleButtonGroup,ToggleButton,Select}=require('./node_modules/@mui/material');
 const deepmerge=require('./node_modules/@mui/utils/deepmerge').default,getDisplayName=require('./node_modules/@mui/utils/getDisplayName').default;
 const html=[];
 for(const disabled of [false,true])html.push(renderToStaticMarkup(React.createElement(MenuList,null,React.createElement(MenuItem,{disabled,key:'one'},'Algebra'),React.createElement(MenuItem,{key:'two'},'Geometry'))));
 for(const value of ['one','two'])html.push(renderToStaticMarkup(React.createElement(ToggleButtonGroup,{value,exclusive:true},React.createElement(ToggleButton,{value:'one'},'One'),React.createElement(ToggleButton,{value:'two'},'Two'))));
 html.push(renderToStaticMarkup(React.createElement(Select,{value:'one'},React.createElement(MenuItem,{value:'one'},'One'),React.createElement(MenuItem,{value:'two'},'Two'))));
 const Component=()=>null,forward=React.forwardRef(Component),memo=React.memo(Component),element=React.createElement(Component);
 const probes=[Component,forward,memo,element].map(component=>deepmerge({}, {component}).component===component);
 assert.ok(probes.every(Boolean));
 process.stdout.write(JSON.stringify({html,probes,names:[getDisplayName(Component),getDisplayName(forward),getDisplayName(memo)],calls}));
}
