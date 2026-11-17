"use strict";
const api=require('./collapses.cjs');
module.exports={...api.collapseClasses,default:api.collapseClasses,getCollapseUtilityClass:api.getCollapseUtilityClass};
