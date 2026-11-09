"use strict";
const { SubscriptionManager } = require("vmotion-utils");
const { time, frame, cancelFrame, frameSteps } = require("./frame.cjs");
const collectMotionValues = { current: undefined };
const events = new Set([
  "change",
  "animationStart",
  "animationComplete",
  "animationCancel",
  "destroy",
]);
class MotionValue {
  constructor(initial, options = {}) {
    this.current = initial;
    this.updatedAt = time.now();
    this.canTrackVelocity =
      initial === undefined ? undefined : !Number.isNaN(parseFloat(initial));
    this.owner = options.owner;
    this.hasAnimated = false;
    this.updateAndNotify = (value) => {
      const now = time.now();
      if (now !== this.updatedAt) this.setPrevFrameValue();
      this.prev = this.current;
      this.current = value;
      this.updatedAt = now;
      if (this.canTrackVelocity === undefined && value !== undefined)
        this.canTrackVelocity = !Number.isNaN(parseFloat(value));
      if (this.prev !== value) {
        this.changes?.notify(value);
        if (this.dependents?.size)
          for (const dependent of Array.from(this.dependents))
            if (this.dependents.has(dependent)) dependent.dirty();
      }
    };
  }
  setCurrent(value) {
    this.current = value;
    this.updatedAt = time.now();
    if (this.canTrackVelocity === undefined && value !== undefined)
      this.canTrackVelocity = !Number.isNaN(parseFloat(value));
  }
  setPrevFrameValue(value = this.current) {
    this.prevFrameValue = value;
    this.prevUpdatedAt = this.updatedAt;
  }
  on(name, callback) {
    if (!events.has(name) || typeof callback !== "function")
      throw new TypeError("invalid MotionValue subscription");
    const manager =
      name === "change"
        ? (this.changes ??= new SubscriptionManager())
        : ((this.events ??= Object.create(null))[name] ??=
            new SubscriptionManager());
    const remove = manager.add(callback);
    if (name !== "change") return remove;
    if (this.stopScheduled) {
      cancelFrame(this.stopIfUnobserved);
      this.stopScheduled = false;
    }
    return () => {
      remove();
      if (!this.changes?.getSize()) {
        this.stopIfUnobserved ??= () => {
          this.stopScheduled = false;
          if (!this.changes?.getSize()) this.stop();
        };
        this.stopScheduled = true;
        frame.read(this.stopIfUnobserved);
      }
    };
  }
  onChange(callback) {
    return this.on("change", callback);
  }
  clearListeners() {
    this.changes?.clear();
    this.changes = undefined;
    if (this.events)
      for (const manager of Object.values(this.events)) manager.clear();
    this.events = undefined;
    if (this.stopScheduled) cancelFrame(this.stopIfUnobserved);
    this.stopScheduled = false;
  }
  attach(effect, stop) {
    if (typeof effect !== "function" || typeof stop !== "function")
      throw new TypeError("passive effects require effect and stop functions");
    this.passiveEffect = effect;
    this.stopPassiveEffect = stop;
  }
  set(value) {
    if (this.passiveEffect) this.passiveEffect(value, this.updateAndNotify);
    else this.updateAndNotify(value);
  }
  setWithVelocity(previous, value, delta) {
    if (!Number.isFinite(delta) || delta < 0)
      throw new RangeError("velocity duration must be finite and nonnegative");
    this.set(value);
    this.prev = undefined;
    this.prevFrameValue = previous;
    this.prevUpdatedAt = this.updatedAt - delta;
  }

  jump(value, endAnimation = true) {
    this.updateAndNotify(value);
    this.prev = value;
    this.prevFrameValue = undefined;
    this.prevUpdatedAt = undefined;
    if (endAnimation) this.stop();
    this.stopPassiveEffect?.();
  }
  dirty() {
    this.changes?.notify(this.current);
  }
  addDependent(dependent) {
    (this.dependents ??= new Set()).add(dependent);
  }
  removeDependent(dependent) {
    this.dependents?.delete(dependent);
  }
  get() {
    collectMotionValues.current?.push(this);
    return this.animation?.liveValue?.() ?? this.current;
  }
  getCurrent() {
    return this.current;
  }
  getPrevious() {
    return this.prev;
  }
  getVelocity() {
    if (
      !this.canTrackVelocity ||
      this.prevFrameValue === undefined ||
      this.prevUpdatedAt === undefined ||
      time.now() - this.updatedAt > 30
    )
      return 0;
    const delta = Math.min(30, this.updatedAt - this.prevUpdatedAt);
    return delta > 0
      ? ((parseFloat(this.current) - parseFloat(this.prevFrameValue)) * 1000) /
          delta
      : 0;
  }
  start(factory) {
    this.stop();
    this.hasAnimated = true;
    const run = {
      active: true,
      ready: false,
      complete: false,
      finished: false,
    };
    this.activeRun = run;
    return new Promise((resolve, reject) => {
      run.reject = reject;
      const finish = () => {
        if (run.finished) return;
        run.complete = true;
        if (!run.ready) return;
        run.finished = true;
        if (run.active && this.activeRun === run) {
          run.active = false;
          this.activeRun = undefined;
          this.animation = undefined;
          try {
            this.events?.animationComplete?.notify();
          } catch (error) {
            reject(error);
            return;
          }
        }
        resolve();
      };
      let animation;
      try {
        animation = factory(finish);
        if (animation !== undefined && typeof animation.stop !== "function")
          throw new TypeError("animation must provide stop()");
        if (this.activeRun === run) {
          this.animation = animation;
          this.events?.animationStart?.notify();
        } else animation?.stop();
        run.ready = true;
        if (run.complete) finish();
      } catch (error) {
        run.active = false;
        if (this.activeRun === run) {
          this.activeRun = undefined;
          this.animation = undefined;
          try {
            animation?.stop();
          } catch {
            /* Preserve the original initialization error. */
          }
        }
        reject(error);
      }
    });
  }
  stop() {
    // Explicit disposal makes the queued unobserved-value check redundant.
    if (this.stopScheduled) {
      frameSteps.read.cancel(this.stopIfUnobserved);
      this.stopScheduled = false;
    }
    const animation = this.animation;
    if (this.activeRun) this.activeRun.active = false;
    this.activeRun = undefined;
    this.animation = undefined;
    if (animation) {
      try {
        animation.stop();
      } finally {
        this.events?.animationCancel?.notify();
      }
    }
  }
  isAnimating() {
    return Boolean(this.animation);
  }
  destroy() {
    let failure;
    try {
      this.stop();
    } catch (error) {
      failure = { error };
    }
    const stop = this.stopPassiveEffect;
    this.passiveEffect = this.stopPassiveEffect = undefined;
    try {
      stop?.();
    } catch (error) {
      failure ??= { error };
    }
    try {
      this.events?.destroy?.notify();
    } catch (error) {
      failure ??= { error };
    } finally {
      this.clearListeners();
      this.dependents?.clear();
    }
    if (failure) throw failure.error;
  }
}
const motionValue = (value, options) => new MotionValue(value, options);
const isMotionValue = (value) =>
  value != null && typeof value.getVelocity === "function";
module.exports = {
  MotionValue,
  motionValue,
  isMotionValue,
  collectMotionValues,
};
Object.defineProperty(module.exports, "failAnimation", {
  value(value, animation, error) {
    if (!(value instanceof MotionValue) || value.animation !== animation)
      return;
    const reject = value.activeRun?.reject;
    try {
      value.stop();
    } catch {}
    reject?.(error);
  },
});
