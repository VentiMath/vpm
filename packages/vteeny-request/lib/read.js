'use strict';
const {StringDecoder} = require('node:string_decoder');
// Callback consumers need text, not a second retained copy of every byte chunk.
// Decode immediately so a producer reusing a buffer cannot alter past data.
module.exports = function read(body, limit, json, complete, fail) {
  const decoder = new StringDecoder('utf8'); let parts = [], count = 0, ended = false;
  function stop() {ended = true; parts = []; body.removeListener('data', data); body.removeListener('end', end); body.removeListener('error', error); body.removeListener('close', close);}
  function error(value) {if (ended) return; stop(); fail(value);}
  function close() {error(Object.assign(new Error(), {code:'ERR_STREAM_PREMATURE_CLOSE'}));}
  function data(chunk) {
    if (ended) return;
    try {
      count += chunk.length;
      if (limit && count > limit) {error({type:'max-size'}); return;}
      parts.push(decoder.write(chunk));
    } catch (value) {error(value);}
  }
  function end() {
    if (ended) return;
    let result = parts.join('') + decoder.end();
    if (json) {try {result = JSON.parse(result);} catch {error({type:'invalid-json'}); return;}}
    stop(); complete(result);
  }
  body.on('error', error); body.on('end', end); body.on('close', close);
  if (body.readableEnded) process.nextTick(end);
  else if (body.destroyed) process.nextTick(close);
  else body.on('data', data);
  return stop;
};
