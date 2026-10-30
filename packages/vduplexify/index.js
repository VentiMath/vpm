'use strict';
const {Duplex, Readable} = require('node:stream');
const stateKey = Symbol('duplexify state');
const defaults = Object.freeze({autoDestroy:false, highWaterMark:16384});
const objectDefaults = Object.freeze({autoDestroy:false, objectMode:true, highWaterMark:16});
const noop = () => {};
function streamError(code, message) {return Object.assign(new Error(message), {code});}
function check(stream, side, owner) {
  if (stream == null || stream === false) return;
  if (stream === owner || typeof stream !== 'object' || typeof stream.on !== 'function' || typeof stream.removeListener !== 'function' ||
      (side === 'writable' ? typeof stream.write !== 'function' || typeof stream.end !== 'function' : typeof stream.read !== 'function' && typeof stream.pause !== 'function')) {
    throw new TypeError('Expected a ' + side + ' stream');
  }
}
function Duplexify(writable, readable, options) {
  if (!(this instanceof Duplexify)) return new Duplexify(writable, readable, options);
  if (options != null && (typeof options !== 'object' || Array.isArray(options))) throw new TypeError('Stream options must be an object');
  check(writable, 'writable', this); check(readable, 'readable', this);
  let forwardDestroy = true, forwardEnd = true, autoDestroy = true;
  if (options == null || options === objectDefaults) options ??= defaults;
  else {
    options = {...options};
    for (const key of ['autoDestroy','destroy','end']) if (options[key] !== undefined && typeof options[key] !== 'boolean') throw new TypeError(key + ' must be a boolean');
    // Stream lifecycle hooks belong to the adapter, not caller options.
    for (const key of ['read','write','writev','final','destroy','construct']) if (typeof options[key] === 'function') throw new TypeError('Custom stream lifecycle hooks are not supported');
    forwardDestroy = options.destroy !== false; forwardEnd = options.end !== false; autoDestroy = options.autoDestroy !== false;
    delete options.destroy; delete options.end;
    // Finishing an upload is not the same as completing its HTTP response.
    // Preserve duplexify's default of destroying on errors, not normal EOF.
    options.autoDestroy ??= false;
    if (options.highWaterMark === undefined) {
      options.readableHighWaterMark ??= options.objectMode || options.readableObjectMode ? 16 : 16384;
      options.writableHighWaterMark ??= options.objectMode || options.writableObjectMode ? 16 : 16384;
    }
  }
  Duplex.call(this, options);
  this[stateKey] = {writable:null, readable:null, source:null, writeBinding:null, readBinding:null,
    forwardDestroy, forwardEnd, autoDestroy, corked:1, waiters:[],
    pending:null, final:null, drained:false, forwarding:false, emitRestore:null, finalizing:false, finalStarted:false};
  if (writable) this.setWritable(writable);
  if (readable) this.setReadable(readable);
}
Object.setPrototypeOf(Duplexify.prototype, Duplex.prototype);
Object.setPrototypeOf(Duplexify, Duplex);
Duplexify.obj = (writable, readable, options) => {
  if (options == null) return new Duplexify(writable, readable, objectDefaults);
  if (options != null && (typeof options !== 'object' || Array.isArray(options))) throw new TypeError('Stream options must be an object');
  return new Duplexify(writable, readable, {...options, objectMode:true, highWaterMark:options?.highWaterMark ?? 16});
};
function detach(state, key) {
  const binding = state[key]; if (!binding) return;
  state[key] = null;
  for (const [event, listener] of binding.listeners) binding.stream.removeListener(event, listener);
}
function bind(stream, listeners) {for (const [event, listener] of listeners) stream.on(event, listener); return {stream, listeners};}
function childFailure(owner, error) {if (!owner.destroyed && owner[stateKey].autoDestroy) owner.destroy(error);}
function destroyedError() {return streamError('ERR_STREAM_DESTROYED', 'Cannot complete operation on a destroyed stream');}
function premature() {return streamError('ERR_STREAM_PREMATURE_CLOSE', 'Attached stream closed before completion');}
function destroyChild(child) {
  if (!child || typeof child.destroy !== 'function') return;
  // Native destruction may emit error asynchronously. These guards contain no
  // reference to the adapter and are removed when the child closes.
  const release = () => {child.removeListener('error', noop); child.removeListener('close', release);};
  child.on('error', noop); child.on('close', release);
  try {if (!child.destroyed) child.destroy();} catch {release();}
  // A closed native stream may still have its error/close events queued.
  if (child.closed) process.nextTick(release);
}
Duplexify.prototype.cork = function() {
  const state = this[stateKey]; if (this.destroyed) return;
  if (++state.corked === 1) this.emit('cork');
};
Duplexify.prototype.uncork = function() {
  const state = this[stateKey];
  if (state.corked && --state.corked === 0) {
    this.emit('uncork');
    while (!state.corked && !this.destroyed && state.waiters.length) state.waiters.shift()();
  }
};
function whenUncorked(owner, fn) {const state = owner[stateKey]; if (state.corked) state.waiters.push(fn); else if (!owner.destroyed) fn();}
Duplexify.prototype.setWritable = function(stream) {
  check(stream, 'writable', this);
  const state = this[stateKey];
  if (this.destroyed) {if (state.forwardDestroy) destroyChild(stream); return;}
  if (stream === state.writable && stream) {this.uncork(); return;}
  if (state.finalStarted && stream) throw new Error('Cannot replace writable during finalization');
  const previous = state.writable;
  detach(state, 'writeBinding'); state.writable = stream || null;
  if (previous && state.pending?.started) {
    const pending = state.pending; state.pending = null;
    process.nextTick(pending.done); // The old sink already accepted this chunk.
  }
  if (!stream) {
    state.corked = 0;
    while (state.waiters.length && !this.destroyed) state.waiters.shift()();
    this.end(); return;
  }
  let finished = stream.writableFinished || stream._writableState?.finished || false;
  const finish = () => {
    finished = true;
    drain();
    if (state.writable === stream && state.forwardEnd && !this.writableEnded && !state.finalizing) this.end();
  };
  const error = value => childFailure(this, value);
  const close = () => {if (!finished) childFailure(this, premature());};
  const drain = () => {const pending = state.pending; if (pending?.target === stream) {state.pending = null; pending.done();}};
  state.writeBinding = bind(stream, [['drain',drain],['finish',finish],['error',error],['close',close]]);
  if (finished) process.nextTick(finish);
  else if (stream.destroyed) process.nextTick(close);
  this.uncork();
};
Duplexify.prototype.setReadable = function(stream) {
  check(stream, 'readable', this);
  const state = this[stateKey];
  if (this.destroyed) {if (state.forwardDestroy) destroyChild(stream); return;}
  if (stream === state.source && stream) return;
  if (this.readableEnded || this._readableState.endEmitted || this._readableState.ended) {
    if (stream) throw new Error('Cannot replace readable after EOF');
    return;
  }
  detach(state, 'readBinding'); state.source = stream || null;
  if (!stream) {state.readable = null; this.push(null); return;}
  const readable = typeof stream.read === 'function' ? stream : new Readable({objectMode:this.readableObjectMode}).wrap(stream);
  state.readable = readable;
  let ended = readable.readableEnded || readable._readableState?.endEmitted || false;
  const end = () => {ended = true; if (state.readable === readable) this.push(null);};
  const error = value => childFailure(this, value);
  const close = () => {if (!ended) childFailure(this, premature());};
  const ready = () => this._forward();
  state.readBinding = bind(readable, [['readable',ready],['end',end],['error',error],['close',close]]);
  if (ended) process.nextTick(end);
  else if (readable.destroyed) process.nextTick(close);
  this._forward();
};
Duplexify.prototype._read = function() {this[stateKey].drained = true; this._forward();};
Duplexify.prototype._forward = function() {
  const state = this[stateKey];
  if (state.forwarding || !state.drained || !state.readable || this.destroyed) return;
  state.forwarding = true;
  try {
    while (state.drained && state.readable && !this.destroyed) {
      const source = state.readable, chunk = source.read();
      if (chunk === null) break;
      state.drained = this.push(chunk);
    }
  } catch (error) {this.destroy(error);}
  finally {state.forwarding = false;}
};
Duplexify.prototype._write = function(chunk, encoding, done) {
  const state = this[stateKey], pending = {chunk, encoding, done, started:false, target:null};
  state.pending = pending;
  whenUncorked(this, () => {
    if (this.destroyed || state.pending !== pending) return;
    const target = state.writable;
    if (!target) {state.pending = null; done(); return;}
    pending.started = true; pending.target = target;
    try {
      const accepted = target.write(chunk, encoding);
      if (accepted !== false && state.pending === pending) {state.pending = null; done();}
    } catch (error) {this.destroy(error);}
  });
};
Duplexify.prototype._final = function(done) {
  const state = this[stateKey]; state.final = done; state.finalizing = true;
  this.emit('preend');
  whenUncorked(this, () => {
    const finish = error => {
      if (this.destroyed || !state.final) return;
      if (error) {this.destroy(error); return;}
      // Only listeners need the historical corkable prefinish phase. Keep
      // native event dispatch on the ordinary transfer path.
      if (this.listenerCount('prefinish')) {
        state.emitRestore = this.emit;
        this.emit = suppressPrefinish;
        state.emitRestore.call(this, 'prefinish');
      }
      whenUncorked(this, () => {if (!state.final) return; state.final = null; done();});
    };
    const target = state.writable;
    state.finalStarted = true;
    try {
      if (!state.forwardEnd || !target || target.writableFinished || target._writableState?.finished) finish();
      else if (target._writableState) target.end(finish);
      else {target.end(); finish();}
    } catch (error) {this.destroy(error);}
  });
};
function suppressPrefinish(event) {
  const state = this[stateKey], emit = state.emitRestore;
  if (event === 'prefinish') {this.emit = emit; state.emitRestore = null; return false;}
  return emit.apply(this, arguments);
}
Duplexify.prototype._destroy = function(error, done) {
  const state = this[stateKey];
  if (!state) {done(error); return;}
  if (state.emitRestore) {if (this.emit === suppressPrefinish) this.emit = state.emitRestore; state.emitRestore = null;}
  const children = new Set([state.source, state.readable, state.writable]);
  detach(state, 'writeBinding'); detach(state, 'readBinding');
  state.source = state.readable = state.writable = null; state.waiters = [];
  const pending = state.pending, final = state.final; state.pending = state.final = null;
  if (pending) pending.done(error || destroyedError());
  if (final) final(error || destroyedError());
  if (state.forwardDestroy) for (const child of children) destroyChild(child);
  done(error);
};
Duplexify.prototype.destroy = function(error, callback) {
  if (callback !== undefined && typeof callback !== 'function') throw new TypeError('Destroy callback must be a function');
  return Duplex.prototype.destroy.call(this, error, callback && (() => callback(null)));
};
module.exports = Duplexify;
