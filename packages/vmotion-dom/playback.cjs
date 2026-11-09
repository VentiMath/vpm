"use strict";
const { easingDefinitionToFunction } = require("vmotion-utils");
const { frame, cancelFrame, time } = require("./frame.cjs");
const { interpolate } = require("./mapping.cjs");

function finite(value, name, minimum = -Infinity) {
  if (!Number.isFinite(value) || value < minimum)
    throw new RangeError(`${name} must be finite and at least ${minimum}`);
  return value;
}
function keyframes({
  keyframes: values,
  duration = 300,
  times,
  ease = "easeInOut",
}) {
  finite(duration, "duration", 0);
  if (!Array.isArray(values) || !values.length)
    throw new TypeError("keyframes must contain finite numbers");
  for (const value of values)
    if (!Number.isFinite(value))
      throw new TypeError("keyframes must contain finite numbers");
  if (times !== undefined) {
    if (!Array.isArray(times) || times.length !== values.length)
      throw new TypeError("times must match keyframes");
    if (times[0] !== 0 || (times.length > 1 && times.at(-1) !== 1))
      throw new RangeError("times must increase from 0 to 1");
    for (let i = 0; i < times.length; i++)
      if (
        !Number.isFinite(times[i]) ||
        times[i] < 0 ||
        times[i] > 1 ||
        (i && times[i] < times[i - 1])
      )
        throw new RangeError("times must increase from 0 to 1");
  }
  const perSegment = Array.isArray(ease) && typeof ease[0] !== "number";
  if (perSegment && ease.length !== Math.max(0, values.length - 1))
    throw new RangeError("one easing is required per keyframe segment");
  const result = { done: false, value: values[0] };
  if (values.length === 2) {
    const a = values[0],
      difference = values[1] - a;
    const definition = perSegment ? ease[0] : ease;
    const easing =
      definition === "linear"
        ? undefined
        : easingDefinitionToFunction(definition);
    return {
      calculatedDuration: duration,
      next(milliseconds) {
        if (!Number.isFinite(milliseconds))
          throw new RangeError("sample time must be finite");
        const p =
          duration === 0
            ? 1
            : Math.max(0, Math.min(1, milliseconds / duration));
        result.value = a + difference * (easing ? easing(p) : p);
        result.done = milliseconds >= duration;
        return result;
      },
    };
  }
  const offsets =
    times ||
    values.map((_, i) => (values.length === 1 ? 0 : i / (values.length - 1)));
  const easing = perSegment
    ? ease.map(easingDefinitionToFunction)
    : easingDefinitionToFunction(ease);
  // interpolate owns both arrays and the resolved easing list.
  const map = interpolate(
    offsets.map((t) => t * duration),
    values,
    { ease: easing },
  );
  return {
    calculatedDuration: duration,
    next(milliseconds) {
      finite(milliseconds, "sample time");
      result.value = map(milliseconds);
      result.done = milliseconds >= duration;
      return result;
    },
  };
}

// The clock is an affine mapping from driver timestamps to elapsed milliseconds.
// Pausing or changing speed reanchors this mapping, preserving the current value.
// Pure sampling is separate from notifications and driver ownership.
class JSAnimation {
  constructor(options) {
    const {
      duration = 300,
      delay = 0,
      repeat = 0,
      repeatDelay = 0,
      repeatType = "loop",
      type = "keyframes",
      autoplay = true,
    } = options;
    if (!["keyframes", "tween", false].includes(type))
      throw new TypeError(
        "only numeric keyframe/tween playback is implemented",
      );
    finite(delay, "delay");
    finite(repeatDelay, "repeatDelay", 0);
    if (!(repeat === Infinity || (Number.isSafeInteger(repeat) && repeat >= 0)))
      throw new RangeError("repeat must be a nonnegative integer or Infinity");
    if (!["loop", "reverse", "mirror"].includes(repeatType))
      throw new TypeError("invalid repeatType");
    for (const name of ["onPlay", "onUpdate", "onComplete", "onStop", "driver"])
      if (options[name] !== undefined && typeof options[name] !== "function")
        throw new TypeError(`${name} must be a function`);
    if (options.finalKeyframe !== undefined)
      finite(options.finalKeyframe, "finalKeyframe");
    this.options = {
      onPlay: options.onPlay,
      onUpdate: options.onUpdate,
      onComplete: options.onComplete,
      onStop: options.onStop,
      finalKeyframe: options.finalKeyframe,
    };
    const generatorOptions = {
      keyframes: options.keyframes,
      duration: type === false ? 0 : duration,
      times: options.times,
      ease: options.ease,
    };
    this.generator = keyframes(generatorOptions);
    this.first = options.keyframes[0];
    this.mirrored =
      repeatType === "mirror" && repeat
        ? keyframes({
            ...generatorOptions,
            keyframes: options.keyframes.toReversed(),
          })
        : undefined;
    this.length = this.generator.calculatedDuration;
    this.delay = delay;
    this.cycle = this.length + repeatDelay;
    if (
      !Number.isFinite(this.cycle) ||
      (repeat === Infinity && this.cycle === 0)
    )
      throw new RangeError(
        "repeating animation requires a finite, positive cycle",
      );
    this.total =
      repeat === Infinity ? Infinity : this.length + this.cycle * repeat;
    if (repeat !== Infinity && !Number.isFinite(this.total))
      throw new RangeError("animation duration overflow");
    this.repeat = repeat;
    this.repeatType = repeatType;
    this.rawTime = 0;
    this.anchorTime = 0;
    this.playbackSpeed = 1;
    this.state = "paused";
    this.startTime = null;
    this.stopped = false;
    this.revision = 0;
    this.result = { done: false, value: this.first };
    this.newPromise();
    const update = (stamp) => this.tick(stamp);
    this.driver = options.driver
      ? options.driver(update)
      : {
          now: () => time.now(),
          start: () => frame.update(this.frameUpdate, true),
          stop: () => cancelFrame(this.frameUpdate),
        };
    if (!options.driver) this.frameUpdate = (data) => update(data.timestamp);
    for (const name of ["now", "start", "stop"])
      if (typeof this.driver?.[name] !== "function")
        throw new TypeError(`driver requires ${name}()`);
    this.stop = () => {
      if (this.stopped) return;
      this.rawTime = this.at(this.driver.now());
      this.stopped = true;
      this.state = "idle";
      this.startTime = null;
      this.revision++;
      try {
        this.driver.stop();
      } finally {
        this.resolve();
        this.options.onStop?.();
      }
    };
    if (autoplay) this.play();
  }
  newPromise() {
    this.settled = false;
    this.finished = new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }
  resolve() {
    this.settled = true;
    this.resolvePromise();
  }
  then(resolve, reject) {
    return this.finished.then(resolve, reject);
  }
  get duration() {
    return this.length / 1000;
  }
  get iterationDuration() {
    return this.duration + this.delay / 1000;
  }
  get time() {
    return Math.max(0, this.rawTime - this.delay) / 1000;
  }
  set time(seconds) {
    finite(seconds, "time");
    const nextTime = finite(seconds * 1000 + this.delay, "time");
    this.rawTime = nextTime;
    this.anchorTime = this.rawTime;
    if (this.state === "running") this.startTime = this.driver.now();
    this.revision++;
    this.publish(this.evaluate(this.rawTime, false));
  }
  get speed() {
    return this.playbackSpeed;
  }
  set speed(speed) {
    finite(speed, "speed");
    const stamp = this.driver.now();
    this.rawTime = this.at(stamp);
    this.anchorTime = this.rawTime;
    if (this.state === "running") this.startTime = stamp;
    this.playbackSpeed = speed;
    this.revision++;
  }
  at(stamp) {
    return this.state === "running" && this.startTime !== null
      ? this.anchorTime + (stamp - this.startTime) * this.playbackSpeed
      : this.rawTime;
  }
  evaluate(raw, finalOverride = true, target = this.result) {
    const elapsed = raw - this.delay;
    const end = elapsed >= this.total;
    const bounded = Math.max(0, Math.min(elapsed, this.total));
    let iteration = this.cycle ? Math.floor(bounded / this.cycle) : this.repeat;
    if (bounded > 0 && bounded === iteration * this.cycle) iteration--;
    iteration = Math.max(0, Math.min(iteration, this.repeat));
    let local = this.cycle ? bounded - iteration * this.cycle : this.length;
    local = Math.min(this.length, local);
    const odd = iteration % 2 === 1;
    if (odd && this.repeatType === "reverse") local = this.length - local;
    const result = (odd && this.mirrored ? this.mirrored : this.generator).next(
      local,
    );
    target.value = elapsed < 0 ? this.first : result.value;
    if (end && finalOverride && this.options.finalKeyframe !== undefined)
      target.value = this.options.finalKeyframe;
    target.done = end;
    return target;
  }
  sampleAt(stamp, resolved = false) {
    return this.evaluate(
      this.at(stamp),
      !resolved,
      (this.sampleResult ??= { done: false, value: this.first }),
    ).value;
  }
  sample(milliseconds) {
    finite(milliseconds, "sample time");
    this.rawTime = Math.max(0, milliseconds);
    const result = this.evaluate(this.rawTime);
    this.publish(result);
    return result;
  }
  publish(result) {
    try {
      this.options.onUpdate?.(result.value);
    } catch (error) {
      this.state = "idle";
      this.stopped = true;
      this.startTime = null;
      this.revision++;
      try {
        this.driver.stop();
      } finally {
        this.resolve();
      }
      throw error;
    }
  }
  tick(stamp) {
    finite(stamp, "frame time");
    if (this.state !== "running") return this.result;
    this.rawTime = this.at(stamp);
    const result = this.evaluate(this.rawTime);
    const done =
      this.playbackSpeed < 0
        ? this.rawTime <= this.delay
        : this.playbackSpeed > 0 && result.done;
    const revision = this.revision;
    this.publish(result);
    if (done && revision === this.revision && this.state === "running")
      this.finish();
    return result;
  }
  play() {
    if (this.stopped || this.state === "running") return;
    if (this.state === "finished")
      this.rawTime = this.playbackSpeed < 0 ? this.total + this.delay : 0;
    if (this.settled) this.newPromise();
    this.anchorTime = this.rawTime;
    this.startTime = this.driver.now();
    this.state = "running";
    this.revision++;
    try {
      this.options.onPlay?.();
      if (this.state === "running") this.driver.start();
    } catch (error) {
      this.state = "idle";
      this.stopped = true;
      this.startTime = null;
      try {
        this.driver.stop();
      } finally {
        this.resolve();
      }
      throw error;
    }
  }
  pause() {
    if (this.state !== "running") return;
    this.rawTime = this.at(this.driver.now());
    this.state = "paused";
    this.revision++;
    this.driver.stop();
  }
  finish() {
    if (this.state === "finished" || this.stopped) return;
    this.state = "finished";
    this.startTime = null;
    this.revision++;
    try {
      this.driver.stop();
    } finally {
      this.resolve();
      this.options.onComplete?.();
    }
  }
  complete() {
    if (this.stopped || this.state === "finished" || this.completing) return;
    // Infinite loops complete at the forward endpoint of the current cycle.
    this.rawTime =
      this.delay + (Number.isFinite(this.total) ? this.total : this.length);
    const revision = this.revision;
    this.completing = true;
    try {
      this.publish(this.evaluate(this.rawTime));
    } finally {
      this.completing = false;
    }
    if (revision === this.revision) this.finish();
  }
  cancel() {
    if (this.stopped || this.cancelling) return;
    this.state = "idle";
    this.startTime = null;
    this.rawTime = 0;
    this.revision++;
    try {
      this.driver.stop();
    } finally {
      this.resolve();
    }
    this.cancelling = true;
    this.result.value = this.first;
    this.result.done = false;
    try {
      this.publish(this.result);
    } finally {
      this.cancelling = false;
    }
  }
}
module.exports = {
  keyframes,
  JSAnimation,
  animateValue: (options) => new JSAnimation(options),
};
