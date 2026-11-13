'use strict';

// An independently authored, deadline-ordered cooperative scheduler. Each task
// lives in one indexed heap, so cancellation releases its callback immediately.
const ready = [], delayed = [];
const owner = {};
let sequence = 0, priority = 3, running = false, posted = false;
let timer = null, timerAt = Infinity, frameStart = -1, slice = 5, paint = false;
const clock = typeof performance === 'object' && typeof performance.now === 'function'
  ? performance.now.bind(performance) : (() => { const epoch = Date.now(); return () => Date.now() - epoch; })();
const defer = typeof setImmediate === 'function' ? setImmediate : null;
const setTimer = setTimeout, clearTimer = clearTimeout;
let channel;
const normalize = p => p === 1 || p === 2 || p === 4 || p === 5 ? p : 3;
const timeout = p => p === 1 ? -1 : p === 2 ? 250 : p === 4 ? 10000 : p === 5 ? 1073741823 : 5000;
const earlier = (a, b) => a.key < b.key || (a.key === b.key && a.id < b.id);
function up(heap, task, index) {
  while (index > 0) {
    const parent = (index - 1) >>> 1;
    if (!earlier(task, heap[parent])) break;
    heap[index] = heap[parent]; heap[index].index = index; index = parent;
  }
  heap[index] = task; task.index = index;
}
function down(heap, task, index) {
  const size = heap.length;
  while (index * 2 + 1 < size) {
    let child = index * 2 + 1;
    if (child + 1 < size && earlier(heap[child + 1], heap[child])) child++;
    if (!earlier(heap[child], task)) break;
    heap[index] = heap[child]; heap[index].index = index; index = child;
  }
  heap[index] = task; task.index = index;
}
function insert(heap, task, queue, key) {
  task.queue = queue; task.key = key;
  up(heap, task, heap.length);
}
function remove(heap, task) {
  const index = task.index, tail = heap.pop();
  if (tail !== task) {
    if (index > 0 && earlier(tail, heap[(index - 1) >>> 1])) up(heap, tail, index);
    else down(heap, tail, index);
  }
  task.index = -1; task.queue = 0;
}
function promote(now) {
  while (delayed.length && delayed[0].start <= now) {
    const task = delayed[0]; remove(delayed, task);
    insert(ready, task, 1, task.deadline);
  }
}
function post() {
  if (posted || running) return;
  posted = true;
  if (defer) defer(flush);
  else if (typeof MessageChannel === 'function') {
    if (!channel) {channel = new MessageChannel(); channel.port1.onmessage = flush;}
    channel.port2.postMessage(0);
  } else setTimer(flush, 0);
}
function armTimer() {
  const next = delayed.length ? delayed[0].start : Infinity;
  if (next === timerAt) return;
  if (timer !== null) clearTimer(timer);
  timer = null; timerAt = next;
  if (next !== Infinity) {
    // Hosts commonly overflow delays above 2^31-1 to one millisecond.
    timer = setTimer(wake, Math.min(2147483647, Math.max(0, next - clock())));
  }
}
function wake() {
  timer = null; timerAt = Infinity;
  promote(clock());
  if (ready.length) post();
  armTimer();
}
function flush() {
  posted = false; running = true; paint = false; frameStart = clock();
  const previous = priority;
  try {
    let now = frameStart;
    promote(now);
    while (ready.length) {
      const task = ready[0];
      if (task.deadline > now && (paint || now - frameStart >= slice)) break;
      remove(ready, task);
      task.queue = 3;
      const callback = task.callback; task.callback = null;
      priority = task.priority;
      let next;
      try {next = callback(task.deadline <= now);}
      catch (error) {task.queue = 0; throw error;}
      now = clock();
      if (task.queue === 3 && typeof next === 'function') {
        task.callback = next;
        insert(ready, task, 1, task.deadline);
        // A continuation yields a host turn even when its slice has time left.
        break;
      }
      task.queue = 0;
      promote(now);
    }
  } finally {
    priority = previous; running = false;
    if (ready.length) post();
    armTimer();
  }
}
function schedule(p, callback, options) {
  if (typeof callback !== 'function') throw new TypeError('Scheduler callback must be a function');
  const delay = options && typeof options.delay === 'number' && options.delay > 0 ? options.delay : 0;
  if (!Number.isFinite(delay)) throw new RangeError('Scheduler delay must be finite');
  const now = clock(), level = normalize(p), start = now + delay;
  if (!Number.isFinite(start)) throw new RangeError('Scheduler start time must be finite');
  const task = {owner, id: ++sequence, priority: level, start, deadline: start + timeout(level), callback, key: 0, index: -1, queue: 0};
  if (delay) {insert(delayed, task, 2, start); armTimer();}
  else {insert(ready, task, 1, task.deadline); post();}
  return task;
}
function cancel(task) {
  if (!task || task.owner !== owner) return;
  const queue = task.queue;
  if (queue === 1) remove(ready, task);
  else if (queue === 2) remove(delayed, task);
  task.queue = 0; task.callback = null;
  if (queue === 2) armTimer();
}
function runWithPriority(level, callback) {
  const previous = priority; priority = normalize(level);
  try {return callback();} finally {priority = previous;}
}
function next(callback) {
  const previous = priority;
  if (priority < 4) priority = 3;
  try {return callback();} finally {priority = previous;}
}
function wrap(callback) {
  const captured = priority;
  return function (...args) {
    const previous = priority; priority = captured;
    try {return callback.apply(this, args);} finally {priority = previous;}
  };
}
function forceFrameRate(fps) {
  if (!Number.isFinite(fps) || fps < 0 || fps > 125) {
    console.error('Scheduler frame rate must be between 0 and 125'); return;
  }
  slice = fps > 0 ? Math.floor(1000 / fps) : 5;
}
module.exports = {
  unstable_ImmediatePriority: 1, unstable_UserBlockingPriority: 2,
  unstable_NormalPriority: 3, unstable_LowPriority: 4, unstable_IdlePriority: 5,
  unstable_Profiling: null,
  unstable_now: clock, unstable_scheduleCallback: schedule, unstable_cancelCallback: cancel,
  unstable_getCurrentPriorityLevel: () => priority,
  unstable_runWithPriority: runWithPriority, unstable_next: next, unstable_wrapCallback: wrap,
  unstable_shouldYield: () => paint || clock() - frameStart >= slice,
  unstable_requestPaint: () => {paint = true;}, unstable_forceFrameRate: forceFrameRate,
};
