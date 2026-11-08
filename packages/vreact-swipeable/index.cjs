"use strict";
const React = require("react"),
  createController = require("./gesture.cjs");
const useCommit =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;
function useSwipeable(options = {}) {
  const ref = React.useRef(null);
  if (ref.current === null) ref.current = createController(options);
  const controller = ref.current;
  useCommit(() => {
    controller.configure(options);
  });
  useCommit(() => () => controller.suspend(), [controller]);
  return React.useMemo(
    () =>
      options.trackMouse
        ? { ref: controller.ref, onMouseDown: controller.mouseDown }
        : { ref: controller.ref },
    [controller, Boolean(options.trackMouse)],
  );
}
exports.useSwipeable = useSwipeable;
exports.LEFT = "Left";
exports.RIGHT = "Right";
exports.UP = "Up";
exports.DOWN = "Down";
