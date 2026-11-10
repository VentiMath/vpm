"use strict";
function each(animations, action) {
  let failure;
  for (const animation of animations) {
    try {
      action(animation);
    } catch (error) {
      failure ??= { error };
    }
  }
  if (failure) throw failure.error;
}
class GroupAnimation {
  constructor(animations) {
    if (!Array.isArray(animations))
      throw new TypeError("animations must be an array");
    this.animations = animations.filter((animation) => animation !== undefined);
    if (
      this.animations.some(
        (animation) => !animation || typeof animation !== "object",
      )
    )
      throw new TypeError("expected playback controls");
    this.stop = () => each(this.animations, (animation) => animation.stop());
  }
  get finished() {
    return Promise.all(this.animations.map((animation) => animation.finished));
  }
  get time() {
    return this.animations[0]?.time ?? 0;
  }
  set time(value) {
    if (!Number.isFinite(value)) throw new RangeError("time must be finite");
    each(this.animations, (animation) => {
      animation.time = value;
    });
  }
  get speed() {
    return this.animations[0]?.speed ?? 1;
  }
  set speed(value) {
    if (!Number.isFinite(value)) throw new RangeError("speed must be finite");
    each(this.animations, (animation) => {
      animation.speed = value;
    });
  }
  get state() {
    return this.animations[0]?.state ?? "idle";
  }
  get startTime() {
    return this.animations[0]?.startTime ?? null;
  }
  get duration() {
    let maximum = 0;
    for (const animation of this.animations)
      maximum = Math.max(maximum, animation.duration);
    return maximum;
  }
  get iterationDuration() {
    let maximum = 0;
    for (const animation of this.animations)
      maximum = Math.max(maximum, animation.iterationDuration);
    return maximum;
  }
  play() {
    each(this.animations, (animation) => animation.play());
  }
  pause() {
    each(this.animations, (animation) => animation.pause());
  }
  cancel() {
    each(this.animations, (animation) => animation.cancel());
  }
  complete() {
    each(this.animations, (animation) => animation.complete());
  }
  attachTimeline(timeline) {
    if (!timeline || typeof timeline.observe !== "function")
      throw new TypeError("timeline requires observe()");
    const cleanups = [];
    const dispose = () => {
      const owned = cleanups.splice(0);
      each(owned, (cleanup) => cleanup());
    };
    try {
      for (const animation of this.animations) {
        let cleanup;
        if (typeof animation.attachTimeline === "function")
          cleanup = animation.attachTimeline(timeline);
        else {
          animation.pause();
          cleanup = timeline.observe(animation);
        }
        if (typeof cleanup !== "function")
          throw new TypeError("timeline must return cleanup");
        cleanups.push(cleanup);
      }
    } catch (error) {
      try {
        dispose();
      } catch {}
      throw error;
    }
    return dispose;
  }
}
class GroupAnimationWithThen extends GroupAnimation {
  then(resolve, reject) {
    return this.finished.then(() => {
      resolve?.();
    }, reject);
  }
}
module.exports = { GroupAnimation, GroupAnimationWithThen };
