'use strict';
const {Transform} = require('node:stream');
const optionKeys = ['highWaterMark','readableHighWaterMark','writableHighWaterMark','autoDestroy','emitClose','allowHalfOpen','signal'];
function limit(value,name,fallback=Infinity) {
  if (value === undefined || value === -1) return fallback;
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(name + ' must be a nonnegative safe integer or -1');
  return value;
}
function streamOptions(query) {
  const options = {};
  if (query && typeof query === 'object') for (const key of optionKeys) if (Object.hasOwn(query,key)) options[key] = query[key];
  return options;
}
function abort(record) {
  if (!record || record.aborted || !record.handle) return;
  record.aborted = true;
  const handle = record.handle;
  try {
    if (typeof handle.abort === 'function') handle.abort();
    else if (typeof handle.cancel === 'function') handle.cancel();
    else if (typeof handle.destroy === 'function') handle.destroy();
  } catch {} // Cancellation must not replace the original stream error.
}
class ResourceStream extends Transform {
  constructor(args = {}, requestFn) {
    if (!args || typeof args !== 'object' || typeof requestFn !== 'function') throw new TypeError('Expected pagination arguments and a request function');
    const supplied = args.streamOptions;
    if (supplied != null && (typeof supplied !== 'object' || Array.isArray(supplied))) throw new TypeError('Stream options must be an object');
    if (supplied) {
      if (supplied.objectMode === false || supplied.readableObjectMode === false || supplied.writableObjectMode === false) throw new TypeError('Pagination streams require object mode');
      for (const key of ['read','write','writev','transform','flush','final','destroy','construct']) if (typeof supplied[key] === 'function') throw new TypeError('Custom pagination lifecycle hooks are not supported');
    }
    const maxCalls = limit(args.maxApiCalls,'maxApiCalls'), maxResults = limit(args.maxResults,'maxResults');
    super({...streamOptions(supplied),objectMode:true});
    this._ended = false; this._reading = false; this._requestsMade = 0;
    this._nextQuery = args.query; this._requestFn = requestFn; this._otherArgs = [];
    this._maxApiCalls = maxCalls; this._resultsToSend = maxResults;
    this._page = null; this._offset = 0; this._draining = false; this._scheduled = null; this._active = null;
  }
  _stop() {
    this._ended = true;
    if (this._scheduled) {clearImmediate(this._scheduled); this._scheduled = null;}
    if (this._active) {this._active.cancelled = true; abort(this._active); this._active = null;}
    this._reading = false; this._page = null;
  }
  end(...args) {this._stop(); return super.end(...args);}
  _destroy(error, done) {this._stop(); done(error);}
  _read() {
    if (this._ended || this.destroyed || this._reading || this._draining) return;
    if (this._page) {this._drainPage(); return;}
    if (this._scheduled) return;
    if (!this._resultsToSend || this._requestsMade >= this._maxApiCalls) {this.end(); return;}
    this._reading = true; this._requestsMade++;
    const record = {settled:false,cancelled:false,aborted:false,handle:null}; this._active = record;
    const receive = (error, results, nextQuery, ...otherArgs) => {
      if (record.settled || record.cancelled || this.destroyed || this._ended) return;
      record.settled = true; this._active = null; this._reading = false;
      if (error) {this.destroy(error); return;}
      try {
        if (!Array.isArray(results)) throw new TypeError('A pagination page must be an array');
        this._otherArgs = otherArgs; this._nextQuery = nextQuery;
        this._page = results.slice(0,Math.min(results.length,this._resultsToSend)); this._offset = 0;
        this._resultsToSend -= this._page.length;
        this._drainPage();
      } catch (error) {this.destroy(error);}
    };
    try {record.handle = this._requestFn(this._nextQuery,receive); if (record.cancelled) abort(record);}
    catch (error) {receive(error);}
  }
  _drainPage() {
    if (this._draining || this._ended || this.destroyed) return;
    this._draining = true;
    try {
      const page = this._page; let more = true, offset = this._offset;
      while (offset < page.length && !this._ended) {
        const value = page[offset++];
        if (value == null) throw new TypeError('Pagination results cannot contain null or undefined');
        more = this.push(value);
        if (more === false) break;
      }
      this._offset = offset;
      if (this._ended || this.destroyed) return;
      if (offset < page.length) return;
      this._page = null;
      if (!this._nextQuery || !this._resultsToSend || this._requestsMade >= this._maxApiCalls) this.end();
      else if (more) this._scheduled = setImmediate(()=>{this._scheduled = null; this._read();});
    } catch (error) {this.destroy(error);}
    finally {this._draining = false;}
  }
}
exports.ResourceStream = ResourceStream;
exports.limit = limit;
exports.streamOptions = streamOptions;
