'use strict';
const React = require('react');
const { useLayoutEffect } = require('vradix-react-use-layout-effect');

function useSize(element) {
  const [measurement, setMeasurement] = React.useState();
  useLayoutEffect(() => {
    if (!element) { setMeasurement(undefined); return; }
    const view = element.ownerDocument.defaultView;
    let active = true, frame = null, latest, computedStyle;
    const publish = (width, height) => {
      if (active) setMeasurement(current => current?.element === element &&
        current.size.width === width && current.size.height === height ? current :
        { element, size: { width, height } });
    };
    const measure = () => {
      frame = null;
      if (!active) return;
      const boxes = latest?.borderBoxSize;
      const box = Array.isArray(boxes) ? boxes[0] : boxes;
      latest = undefined;
      if (box && Number.isFinite(box.inlineSize) && Number.isFinite(box.blockSize)) {
        // ResizeObserver dimensions are logical; the public size is physical.
        // CSSOM computed styles are live; retain the view instead of creating
        // a new style object on every notification. Read its current mode.
        computedStyle ??= view.getComputedStyle(element);
        const vertical = /^(vertical|sideways)-/.test(computedStyle.writingMode);
        publish(vertical ? box.blockSize : box.inlineSize, vertical ? box.inlineSize : box.blockSize);
      } else publish(element.offsetWidth, element.offsetHeight);
    };
    const schedule = () => {
      if (active && frame === null) frame = view.requestAnimationFrame(measure);
    };
    publish(element.offsetWidth, element.offsetHeight);
    // Use the target's window: the importing window may have a different realm
    // or may not supply ResizeObserver (for example, a print/test window).
    const Observer = view?.ResizeObserver;
    const observer = Observer ? new Observer(entries => {
      if (!active || !Array.isArray(entries)) return;
      const entry = entries.find(item => item.target === element);
      if (entry) { latest = entry; schedule(); }
    }) : undefined;
    const cleanup = () => {
      active = false;
      if (frame !== null) view.cancelAnimationFrame(frame);
      observer?.disconnect();
      view?.removeEventListener('resize', schedule);
    };
    try {
      if (observer) observer.observe(element, { box: 'border-box' });
      else view?.addEventListener('resize', schedule);
    } catch (error) { cleanup(); throw error; }
    return cleanup;
  }, [element]);
  // Do not expose the previous target while its layout effect is being replaced.
  return measurement?.element === element ? measurement?.size : undefined;
}
exports.useSize = useSize;
