'use strict';
exports.record=function(value,name){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(name+' must be an object');return value;};
exports.limit=function(value,name){if(value===undefined||value===Infinity)return 0;if(!Number.isSafeInteger(value)||value<0)throw new RangeError(name+' must be a nonnegative safe integer or Infinity');return value;};
exports.hook=function(value,name){if(value==null)return null;if(typeof value!=='function')throw new TypeError(name+' must be a function');return value;};
exports.name=function(name){if(typeof name!=='string'||!name||name[0]==='#'||/[\s&;!?\\/\[\]$%{}^*()<>|+]/u.test(name))throw new TypeError('Invalid entity name: '+String(name));return name;};
