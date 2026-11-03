'use strict';
let sink;
exports.setLogFunction=fn=>{if(fn!==null&&typeof fn!=='function')throw new TypeError('Expected logging callback');sink=fn;};
exports.lifecycle=method=>{try{sink?.('Firestore request',method);}catch{}};
