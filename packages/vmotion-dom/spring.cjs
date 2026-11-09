"use strict";

function finite(value, name, lower = -Infinity) {
  if (!Number.isFinite(value) || value < lower)
    throw new RangeError(`${name} must be finite and at least ${lower}`);
  return value;
}
// Unit step response for a critically/over-damped oscillator. Using real roots
// avoids the exp(-a*t)*cosh(b*t) overflow that can produce NaN at late samples.
function residual(ratio, u) {
  if (ratio === 1) return (1 + u) * Math.exp(-u);
  const q = Math.sqrt(ratio * ratio - 1),
    fast = ratio + q,
    slow = 1 / fast;
  return (fast * Math.exp(-slow * u) - slow * Math.exp(-fast * u)) / (2 * q);
}
function settlingFrequency(ratio, seconds, threshold) {
  let lo = 0,
    hi = 1;
  while (residual(ratio, hi) > threshold) hi *= 2;
  for (let i = 0; i < 56; i++) {
    const mid = (lo + hi) / 2;
    if (residual(ratio, mid) > threshold) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2 / seconds;
}
function spring(options = {}, bounceArgument) {
  if (typeof options === "number")
    options = {
      visualDuration: options,
      bounce: bounceArgument ?? 0.3,
      keyframes: [0, 1],
    };
  const physics =
    options.stiffness !== undefined ||
    options.damping !== undefined ||
    options.mass !== undefined;
  let stiffness = options.stiffness ?? 100,
    damping = options.damping ?? 10,
    mass = options.mass ?? 1;
  finite(stiffness, "stiffness", Number.MIN_VALUE);
  finite(mass, "mass", Number.MIN_VALUE);
  finite(damping, "damping", 0);
  let duration = null,
    initialVelocity = options.velocity ?? 0;
  finite(initialVelocity, "velocity");
  if (options.duration !== undefined) finite(options.duration, "duration", 0);
  if (options.visualDuration !== undefined)
    finite(options.visualDuration, "visualDuration", Number.MIN_VALUE);
  if (options.bounce !== undefined) {
    finite(options.bounce, "bounce", -1);
    if (options.bounce > 1) throw new RangeError("bounce must be at most 1");
  }
  if (
    !physics &&
    (options.duration !== undefined ||
      options.bounce !== undefined ||
      options.visualDuration !== undefined)
  ) {
    const bounce = options.bounce ?? 0.3;
    const ratio =
      bounce < 0 ? Math.min(20, 1 / (1 + bounce)) : Math.max(0.05, 1 - bounce);
    let frequency;
    if (options.visualDuration !== undefined) {
      // A visual period of 1.2*duration matches the documented visual-duration
      // convention. Overdamped curves reach the critical curve's residual there.
      const u = (2 * Math.PI) / 1.2;
      frequency =
        ratio > 1
          ? settlingFrequency(ratio, options.visualDuration, residual(1, u))
          : u / options.visualDuration;
    } else {
      duration = Math.max(10, Math.min(10000, options.duration ?? 800));
      frequency =
        ratio >= 1
          ? settlingFrequency(ratio, duration / 1000, 0.001)
          : Math.log(ratio / (Math.sqrt(1 - ratio * ratio) * 0.001)) /
            ((ratio * duration) / 1000);
    }
    mass = 1;
    stiffness = frequency * frequency;
    damping = 2 * ratio * frequency;
    initialVelocity = 0;
  }
  const w2 = stiffness / mass,
    decay = damping / (2 * mass);
  if (!Number.isFinite(w2) || !Number.isFinite(decay) || w2 === 0)
    throw new RangeError(
      "spring coefficients exceed the supported numeric range",
    );
  const discriminant = decay * decay - w2;
  if (!Number.isFinite(discriminant))
    throw new RangeError(
      "spring coefficients exceed the supported numeric range",
    );
  const configuredDelta = options.restDelta,
    configuredSpeed = options.restSpeed;
  let first, last, velocity, restDelta, restSpeed;
  let mode, frequency, a, b, slow, fast, velocitySine;
  function configure(values, nextVelocity) {
    if (
      !Array.isArray(values) ||
      values.length !== 2 ||
      !Number.isFinite(values[0]) ||
      !Number.isFinite(values[1])
    )
      throw new TypeError("spring requires two finite numeric keyframes");
    finite(nextVelocity, "velocity");
    const offset = values[0] - values[1];
    finite(offset, "spring displacement");
    const small = Math.abs(offset) < 5;
    const delta = configuredDelta ?? (small ? 0.005 : 0.5),
      speed = configuredSpeed ?? (small ? 0.01 : 2);
    finite(delta, "restDelta", 0);
    finite(speed, "restSpeed", 0);
    let nextMode, nextA, nextB, nextFrequency, nextSlow, nextFast;
    if (Math.abs(discriminant) <= w2 * 1e-12) {
      nextMode = 0;
      nextA = offset;
      nextB = nextVelocity + decay * offset;
    } else if (discriminant < 0) {
      nextMode = -1;
      nextFrequency = Math.sqrt(-discriminant);
      nextA = offset;
      nextB = (nextVelocity + decay * offset) / nextFrequency;
    } else {
      nextMode = 1;
      nextFrequency = Math.sqrt(discriminant);
      nextFast = -decay - nextFrequency;
      nextSlow = -w2 / (decay + nextFrequency);
      nextA = (nextVelocity - nextFast * offset) / (nextSlow - nextFast);
      nextB = offset - nextA;
    }
    const nextVelocitySine =
      nextMode === -1 ? -decay * nextB - nextFrequency * nextA : 0;
    if (
      !Number.isFinite(nextA) ||
      !Number.isFinite(nextB) ||
      !Number.isFinite(nextVelocitySine)
    )
      throw new RangeError(
        "spring amplitude exceeds the supported numeric range",
      );
    first = values[0];
    last = values[1];
    velocity = nextVelocity;
    restDelta = delta;
    restSpeed = speed;
    mode = nextMode;
    a = nextA;
    b = nextB;
    frequency = nextFrequency;
    slow = nextSlow;
    fast = nextFast;
    velocitySine = nextVelocitySine;
  }
  configure(options.keyframes ?? [0, 1], initialVelocity);
  const result = { value: first, done: false };
  let sampledTime = NaN,
    position = first,
    speed = velocity;
  const evaluate =
    mode < 0
      ? (seconds) => {
          const envelope = Math.exp(-decay * seconds),
            angle = frequency * seconds;
          if (envelope === 0) {
            position = last;
            speed = 0;
            return;
          }
          if (!Number.isFinite(angle))
            throw new RangeError(
              "spring phase exceeds the supported numeric range",
            );
          const cosine = Math.cos(angle),
            sine = Math.sin(angle);
          position = last + envelope * (a * cosine + b * sine);
          speed = envelope * (velocity * cosine + velocitySine * sine);
        }
      : mode === 0
        ? (seconds) => {
            const envelope = Math.exp(-decay * seconds);
            if (envelope === 0) {
              position = last;
              speed = 0;
              return;
            }
            const linear = b * seconds;
            position = last + envelope * (a + linear);
            speed = envelope * (velocity - decay * linear);
          }
        : (seconds) => {
            const x = a * Math.exp(slow * seconds),
              y = b * Math.exp(fast * seconds);
            position = last + x + y;
            speed = slow * x + fast * y;
          };
  function sample(milliseconds) {
    // next(t) and velocity(t) share one analytic evaluation. An invalid time is
    // never cached; retarget invalidates even a same-timestamp sample.
    if (milliseconds === sampledTime) return;
    finite(milliseconds, "sample time");
    if (milliseconds <= 0) {
      position = first;
      speed = velocity;
    } else evaluate(milliseconds / 1000);
    sampledTime = milliseconds;
  }
  return {
    calculatedDuration: duration,
    next(milliseconds) {
      sample(milliseconds);
      result.done =
        duration === null
          ? Math.abs(speed) <= restSpeed &&
            Math.abs(position - last) <= restDelta
          : milliseconds >= duration;
      result.value = result.done ? last : position;
      return result;
    },
    velocity(milliseconds) {
      sample(milliseconds);
      return speed;
    },
    retarget(values, nextVelocity = 0) {
      configure(values, nextVelocity);
      sampledTime = NaN;
    },
  };
}
function calcGeneratorDuration(generator, timeStep = 50, maxDuration = 20000) {
  finite(timeStep, "timeStep", Number.MIN_VALUE);
  finite(maxDuration, "maxDuration", 0);
  if (maxDuration / timeStep > 1e6)
    throw new RangeError("duration sampling exceeds one million steps");
  for (let t = 0; t <= maxDuration; t += timeStep)
    if (generator.next(t).done) return t;
  return Infinity;
}
module.exports = { spring, calcGeneratorDuration, maxGeneratorDuration: 20000 };
