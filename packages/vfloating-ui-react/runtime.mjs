import * as React from "react";
import { useFloating as usePosition } from "vfloating-ui-react-dom";
import { useCommit, useEvent, emitter } from "./shared.mjs";
export * from "vfloating-ui-react-dom";
export { useInteractions, useMergeRefs } from "./shared.mjs";
export {
  useClick,
  useDismiss,
  useFocus,
  useHover,
  useRole,
  FloatingDelayGroup,
  useDelayGroup,
  useDelayGroupContext,
} from "./interactions.mjs";
export { FloatingPortal, FloatingFocusManager } from "./focus.mjs";
export {
  FloatingList,
  useListItem,
  useListNavigation,
  useTypeahead,
} from "./list.mjs";
export function useId() {
  return "floating-ui-" + React.useId();
}
export function useFloatingRootContext({
  open = false,
  onOpenChange,
  elements = {},
} = {}) {
  const dataRef = React.useRef({}),
    events = React.useMemo(emitter, []),
    floatingId = useId();
  const change = useEvent((value, event, reason) => {
    dataRef.current.openEvent = value ? event : undefined;
    dataRef.current.closeReason = value ? undefined : reason;
    events.emit("openchange", { open: value, event, reason, nested: false });
    onOpenChange?.(value, event, reason);
  });
  return React.useMemo(
    () => ({
      open,
      onOpenChange: change,
      dataRef,
      events,
      floatingId,
      elements: {
        reference: elements.reference || null,
        floating: elements.floating || null,
        domReference:
          elements.reference?.nodeType === 1 ? elements.reference : null,
      },
    }),
    [
      open,
      change,
      dataRef,
      events,
      floatingId,
      elements.reference,
      elements.floating,
    ],
  );
}
export function useFloating(options = {}) {
  const own = useFloatingRootContext(options),
    root = options.rootContext || own;
  const [reference, setDom] = React.useState(null),
    [positionReference, setPosition] = React.useState(null);
  const domReference = root.elements.domReference || reference,
    domRef = React.useRef(domReference);
  const result = usePosition({
    ...options,
    // Component APIs often join side + alignment, including the word "center".
    // Canonicalize that alias before middleware sees the placement.
    placement: options.placement?.replace(/^(top|right|bottom|left)-center$/, "$1"),
    open: root.open,
    elements: {
      reference: positionReference || root.elements.reference || reference,
      floating: root.elements.floating,
    },
  });
  const setReference = React.useCallback((node) => {
    if (!node || node.nodeType === 1) {
      domRef.current = node;
      setDom(node);
    } else setPosition(node);
  }, []);
  const setPositionReference = React.useCallback(
    (node) =>
      setPosition(
        node?.nodeType === 1
          ? {
              contextElement: node,
              getBoundingClientRect: () => node.getBoundingClientRect(),
              getClientRects: () => node.getClientRects(),
            }
          : node,
      ),
    [],
  );
  useCommit(() => {
    domRef.current = domReference;
  }, [domReference]);
  const refs = React.useMemo(
    () => ({
      ...result.refs,
      domReference: domRef,
      setReference,
      setPositionReference,
    }),
    [result.refs, setReference, setPositionReference],
  );
  const elements = React.useMemo(
    () => ({ ...result.elements, domReference }),
    [result.elements, domReference],
  );
  const context = React.useMemo(
    () => ({ ...result, ...root, refs, elements, nodeId: options.nodeId }),
    [result, root, refs, elements, options.nodeId],
  );
  useCommit(() => {
    root.dataRef.current.floatingContext = context;
  });
  return React.useMemo(
    () => ({ ...result, refs, elements, context }),
    [result, refs, elements, context],
  );
}
