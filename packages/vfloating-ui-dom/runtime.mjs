import {computePosition as computeCore} from 'vfloating-ui-core';
import {platform} from './geometry.mjs';
export {platform};
export {autoUpdate} from './updates.mjs';
export {getOverflowAncestors} from 'vfloating-ui-utils/dom';
export {arrow, autoPlacement, detectOverflow, flip, hide, inline, limitShift, offset, shift, size} from 'vfloating-ui-core';

export function computePosition(reference, floating, options = {}) {
  options ??= {};
  const configured = options.platform;
  const methods = {...platform, ...configured};
  // Class-based custom platforms keep inherited overrides too.
  if (configured) for (const key of [...Object.keys(platform), 'detectOverflow']) {
    if (key in configured) methods[key] = configured[key];
  }
  methods._c = new Map();
  return computeCore(reference, floating, {...options, platform: methods});
}
