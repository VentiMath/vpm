'use strict';

// A dispatch keeps the original array and length. Removing a subscription
// replaces the live array, so it cannot erase pending calls in that dispatch.
function EventEmitter() {
  this._events = Object.create(null);
  this._eventsCount = 0;
}
function drop(emitter, event) {
  if (--emitter._eventsCount === 0) emitter._events = Object.create(null);
  else delete emitter._events[event];
}
function add(emitter, event, fn, context, once) {
  if (typeof fn !== 'function') throw new TypeError('The listener must be a function');
  const entry = { fn, context: context || emitter, once };
  if (Object.hasOwn(emitter._events, event)) emitter._events[event].push(entry);
  else { emitter._events[event] = [entry]; emitter._eventsCount++; }
  return emitter;
}
EventEmitter.prototype.on = function(event, fn, context) { return add(this, event, fn, context, false); };
EventEmitter.prototype.once = function(event, fn, context) { return add(this, event, fn, context, true); };
EventEmitter.prototype.emit = function(event, ...args) {
  const list = this._events[event];
  if (!list) return false;
  const count = list.length;
  for (let i = 0; i < count; i++) {
    const entry = list[i];
    // Retire once subscriptions before calling user code, including recursion
    // and exceptions. Duplicate matching registrations follow EventEmitter3.
    if (entry.once) this.removeListener(event, entry.fn, entry.context, true);
    Reflect.apply(entry.fn, entry.context, args);
  }
  return true;
};
EventEmitter.prototype.removeListener = function(event, fn, context, once) {
  const list = this._events[event];
  if (!list) return this;
  if (!fn) return this.removeAllListeners(event);
  if (list.length === 1) {
    const entry = list[0];
    if (entry.fn === fn && (!context || entry.context === context) && (!once || entry.once)) drop(this, event);
    return this;
  }
  const remaining = list.filter(entry => entry.fn !== fn || (context && entry.context !== context) || (once && !entry.once));
  if (remaining.length) this._events[event] = remaining;
  else drop(this, event);
  return this;
};
EventEmitter.prototype.removeAllListeners = function(event) {
  if (event === undefined) { this._events = Object.create(null); this._eventsCount = 0; }
  else if (Object.hasOwn(this._events, event)) drop(this, event);
  return this;
};
EventEmitter.prototype.listeners = function(event) {
  return Object.hasOwn(this._events, event) ? this._events[event].map(entry => entry.fn) : [];
};
EventEmitter.prototype.listenerCount = function(event) {
  return Object.hasOwn(this._events, event) ? this._events[event].length : 0;
};
EventEmitter.prototype.eventNames = function() { return Reflect.ownKeys(this._events); };
EventEmitter.prototype.addListener = EventEmitter.prototype.on;
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prefixed = false;
EventEmitter.EventEmitter = EventEmitter;
module.exports = EventEmitter;
