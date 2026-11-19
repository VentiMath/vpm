'use strict';
const {createColors}=require('./core.cjs');
module.exports=createColors(false);
module.exports.createColors=()=>createColors(false);
