'use strict';
function isStream(value){return value!==null&&typeof value==='object'&&typeof value.pipe==='function';}
function object(value){return value!==null&&typeof value==='object';}
function writable(value){return isStream(value)&&value.writable!==false&&typeof value._write==='function'&&object(value._writableState);}
function readable(value){return isStream(value)&&value.readable!==false&&typeof value._read==='function'&&object(value._readableState);}
function duplex(value){return isStream(value)&&value.writable!==false&&typeof value._write==='function'&&object(value._writableState)&&value.readable!==false&&typeof value._read==='function'&&object(value._readableState);}
function transform(value){return duplex(value)&&typeof value._transform==='function';}
module.exports=isStream;
module.exports.writable=writable;
module.exports.readable=readable;
module.exports.duplex=duplex;
module.exports.transform=transform;
