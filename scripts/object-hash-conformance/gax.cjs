'use strict';
const path=require('node:path'),{createRequire}=require('node:module');
// Compile real installed gax modules with only their object-hash import replaced.
// No copied cache implementation or installed-file edits are involved.
function load(relative,hash){const file=path.join(__dirname,'node_modules/google-gax/build/src',relative),from=createRequire(file),Module=require('node:module'),mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));mod.require=name=>name==='object-hash'?hash:from(name);new Function('exports','require','module','__filename','__dirname',require('node:fs').readFileSync(file,'utf8'))(mod.exports,mod.require,mod,file,path.dirname(file));return mod.exports;}
const schema={nested:{fixture:{nested:{Item:{fields:{name:{type:'string',id:1},count:{type:'int32',id:2}}},Catalog:{methods:{Get:{requestType:'Item',responseType:'Item'}}}}}}};
module.exports={load,schema};
