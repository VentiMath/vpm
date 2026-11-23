'use strict';
const engine=require('vresvg/internal-paths'),{VlxError}=require('./source.cjs');
for(const [name,fn]of Object.entries(engine))exports[name]=(...args)=>{try{return fn(...args)}catch(error){if(error.name==='RasterError')throw new VlxError(error.code,error.message,{cause:error});throw error;}};
