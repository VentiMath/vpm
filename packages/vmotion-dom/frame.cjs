"use strict";
const { MotionGlobalConfig } = require("vmotion-utils");
const phases = [
  "setup",
  "read",
  "resolveKeyframes",
  "preUpdate",
  "update",
  "preRender",
  "render",
  "postRender",
];
const frameData = { delta: 0, timestamp: 0, isProcessing: false };
let cachedTime,
  resetQueued = false;
const time = {
  now() {
    if (cachedTime === undefined)
      time.set(
        frameData.isProcessing || MotionGlobalConfig.useManualTiming
          ? frameData.timestamp
          : performance.now(),
      );
    return cachedTime;
  },
  set(value) {
    cachedTime = value;
    if (!resetQueued) {
      resetQueued = true;
      queueMicrotask(() => {
        cachedTime = undefined;
        resetQueued = false;
      });
    }
  },
};

function buildBatcher(
  request,
  allowKeepAlive,
  state = { delta: 0, timestamp: 0, isProcessing: false },
  canRequest,
) {
  let requested = false,
    continuing = false,
    generation = 0;
  const schedule = {},
    steps = {},
    queues = [];
  const hasWork = () => queues.some((q) => q.pending.size !== 0);
  function wake() {
    if (state.isProcessing || requested || (canRequest && !canRequest()))
      return;
    requested = true;
    const token = ++generation;
    try {
      if (
        request(() => {
          if (token !== generation) return;
          requested = false;
          if (hasWork()) process();
          else continuing = false;
        }) === false
      )
        requested = false;
    } catch (error) {
      requested = false;
      throw error;
    }
  }
  for (const phase of phases) {
    const queue = { pending: new Set(), current: new Set() };
    const repeat = new Set(),
      visited = [];
    let processing = false;
    queues.push(queue);
    function enqueue(callback, keepAlive = false, immediate = false) {
      if (typeof callback !== "function")
        throw new TypeError("frame callback must be a function");
      const target =
        processing && immediate && !visited.includes(callback)
          ? queue.current
          : queue.pending;
      target.add(callback);
      if (keepAlive && allowKeepAlive) repeat.add(callback);
      wake();
      return callback;
    }
    steps[phase] = {
      schedule: enqueue,
      cancel(callback) {
        queue.pending.delete(callback);
        if (queue.current.size) queue.current.delete(callback);
        if (repeat.size) repeat.delete(callback);
      },
      process(data) {
        if (processing || !queue.pending.size) return;
        processing = true;
        const ready = queue.pending;
        queue.pending = queue.current;
        queue.current = ready;
        let failure;
        try {
          for (const callback of queue.current) {
            visited.push(callback);
            try {
              callback(data);
            } catch (error) {
              failure ??= { error };
            }
            if (
              repeat.size &&
              repeat.has(callback) &&
              queue.current.has(callback)
            )
              enqueue(callback, true);
          }
        } finally {
          queue.current.clear();
          visited.length = 0;
          processing = false;
        }
        if (failure) throw failure.error;
      },
    };
    schedule[phase] = enqueue;
  }
  function process(timestamp = performance.now(), manual = false) {
    if (state.isProcessing) return;
    requested = false;
    generation++;
    if (!Number.isFinite(timestamp))
      throw new TypeError("frame timestamp must be finite");
    state.delta = manual
      ? timestamp - state.timestamp
      : continuing
        ? Math.min(40, Math.max(1, timestamp - state.timestamp))
        : 1000 / 60;
    state.timestamp = timestamp;
    state.isProcessing = true;
    if (state === frameData) time.set(timestamp);
    let failure;
    try {
      for (const phase of phases) {
        try {
          steps[phase].process(state);
        } catch (error) {
          failure ??= { error };
        }
      }
    } finally {
      state.isProcessing = false;
      continuing = hasWork();
      if (continuing) wake();
    }
    if (failure) throw failure.error;
  }
  return {
    batcher: {
      schedule,
      cancel(callback) {
        for (const phase of phases) steps[phase].cancel(callback);
      },
      state,
      steps,
    },
    process,
  };
}
function createRenderBatcher(request, allowKeepAlive, state) {
  return buildBatcher(request, allowKeepAlive, state).batcher;
}
// Server imports do not create timers. An explicit processFrame call can drive
// the same queues without a browser; browser requests are coalesced per batch.
let browserRequest;
const main = buildBatcher(
  (callback) => browserRequest.call(globalThis, callback),
  true,
  frameData,
  () => {
    browserRequest = globalThis.requestAnimationFrame;
    return (
      !MotionGlobalConfig.useManualTiming &&
      typeof browserRequest === "function"
    );
  },
);
const micro = buildBatcher((callback) => queueMicrotask(callback), false);
module.exports = {
  frame: main.batcher.schedule,
  cancelFrame: main.batcher.cancel,
  frameSteps: main.batcher.steps,
  frameData,
  createRenderBatcher,
  processFrame: (timestamp) =>
    main.process(
      MotionGlobalConfig.useManualTiming
        ? (timestamp ?? frameData.timestamp)
        : performance.now(),
      Boolean(MotionGlobalConfig.useManualTiming),
    ),
  microtask: micro.batcher.schedule,
  cancelMicrotask: micro.batcher.cancel,
  time,
};
