#!/usr/bin/env node
'use strict';
const uuid=require('..');
const [command='v4',name,namespace,...extra]=process.argv.slice(2);
try{
 if(command==='--help'||command==='--version'){console.log(command==='--version'?require('../package.json').version:'Usage: vuuid [v1|v4] | vuuid [v3|v5] <name> <namespace|DNS|URL>');}
 else if((command==='v1'||command==='v4')&&name===undefined)console.log(uuid[command]());
 else if((command==='v3'||command==='v5')&&name!==undefined&&namespace!==undefined&&!extra.length)console.log(uuid[command](name,uuid[command][namespace.toUpperCase()]||namespace));
 else throw new TypeError('Usage: vuuid [v1|v4] | vuuid [v3|v5] <name> <namespace|DNS|URL>');
}catch(error){console.error(error.message);process.exitCode=1;}
