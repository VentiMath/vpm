import {getWindow, getDocumentElement, getOverflowAncestors} from 'vfloating-ui-utils/dom';
import {elementOf, measuredRect} from './geometry.mjs';

const equal = (a, b) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

// A subscription owns every callback, observer and scheduled task it creates.
export function autoUpdate(reference, floating, update, options = {}) {
  const element = elementOf(reference), win = getWindow(element || floating);
  const Resize = win.ResizeObserver || globalThis.ResizeObserver;
  const Intersection = win.IntersectionObserver || globalThis.IntersectionObserver;
  const {ancestorScroll = true, ancestorResize = true,
    elementResize = typeof Resize === 'function', layoutShift = typeof Intersection === 'function', animationFrame = false} = options;
  let active = true, resize, intersection, timer, reobserve, frame, generation = 0;
  const removals = [];
  const notify = () => { if (active) update(); };
  const cancel = id => { if (id !== undefined) win.cancelAnimationFrame(id); };
  const listen = (target, type, callback, options) => {
    target.addEventListener(type, callback, options);
    removals.push(() => target.removeEventListener(type, callback, options));
  };
  function stopMovement() {
    generation++;
    win.clearTimeout(timer); timer = undefined;
    intersection?.disconnect(); intersection = undefined;
  }
  function cleanup() {
    if (!active) return;
    active = false;
    for (const remove of removals) remove();
    stopMovement(); resize?.disconnect(); resize = undefined;
    cancel(reobserve); cancel(frame);
  }
  function watchMovement(skip = false, threshold = 1) {
    if (!active) return;
    stopMovement();
    const observed = element.getBoundingClientRect(), root = getDocumentElement(element);
    if (!skip) notify();
    if (!active || !observed.width || !observed.height) return;
    const epoch = generation;
    const margins = [observed.top, root.clientWidth - observed.right, root.clientHeight - observed.bottom, observed.left];
    const config = {rootMargin: margins.map(n => -Math.floor(n) + 'px').join(' '), threshold: Math.max(0, Math.min(1, threshold)) || 1};
    let first = true;
    const receive = entries => {
      if (!active || epoch !== generation || !entries.length) return;
      if (!equal(observed, element.getBoundingClientRect())) return watchMovement();
      const ratio = entries[0].intersectionRatio;
      if (ratio !== threshold) {
        if (!first) return watchMovement();
        if (ratio === 0) timer = win.setTimeout(() => watchMovement(false, 1e-7), 1000);
        else return watchMovement(false, ratio);
      }
      first = false;
    };
    try { intersection = new Intersection(receive, {...config, root: root.ownerDocument}); }
    catch { intersection = new Intersection(receive, config); }
    intersection.observe(element);
  }
  try {
    if (ancestorScroll || ancestorResize) {
      const targets = new Set([...(element ? getOverflowAncestors(element) : []), ...(floating ? getOverflowAncestors(floating) : [])]);
      for (const target of targets) {
        if (ancestorScroll) listen(target, 'scroll', notify);
        if (ancestorResize) listen(target, 'resize', notify);
      }
    }
    if (element && layoutShift) {
      listen(win, 'resize', () => watchMovement(ancestorResize));
      watchMovement(true);
    }
    if (elementResize) {
      resize = new Resize(entries => {
        if (!active) return;
        if (entries[0]?.target === element && floating) {
          resize.unobserve(floating); cancel(reobserve);
          reobserve = win.requestAnimationFrame(() => { reobserve = undefined; if (active) resize.observe(floating); });
        }
        notify();
      });
      if (element && !animationFrame) resize.observe(element);
      if (floating) resize.observe(floating);
    }
    if (animationFrame) {
      let previous = measuredRect(reference);
      const tick = () => {
        if (!active) return;
        const current = measuredRect(reference);
        if (!equal(previous, current)) notify();
        previous = current;
        if (active) frame = win.requestAnimationFrame(tick);
      };
      tick();
    }
    notify();
    return cleanup;
  } catch (error) {
    cleanup(); throw error;
  }
}
