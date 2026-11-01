'use strict';
// Peer dependencies deliberately stay in this fixture, not the VPM workspace.
const fs=require('node:fs'),path=require('node:path');
const local=path.resolve(__dirname,'../../packages/vfloating-ui-react-dom/node_modules');
fs.mkdirSync(local,{recursive:true});
for(const name of ['react','react-dom']) {
  const target=path.join(local,name), source=path.join(__dirname,'node_modules',name);
  if(!fs.existsSync(target))fs.symlinkSync(source,target,'dir');
  if(fs.realpathSync(target)!==fs.realpathSync(source))throw Error('Unexpected peer installation: '+target);
}
