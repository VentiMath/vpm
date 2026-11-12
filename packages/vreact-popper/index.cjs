"use strict";
const React = require("react"),
  floating = require("vfloating-ui-dom"),
  compare = require("vreact-fast-compare");
const ReferenceContext = React.createContext(null),
  SetReferenceContext = React.createContext(null);
const commit =
  typeof document === "undefined" ? React.useEffect : React.useLayoutEffect;
const empty = [];
function Manager({ children }) {
  const [reference, setReference] = React.useState(null);
  return React.createElement(
    SetReferenceContext.Provider,
    { value: setReference },
    React.createElement(
      ReferenceContext.Provider,
      { value: reference },
      children,
    ),
  );
}
function assign(ref, value) {
  if (typeof ref === "function") return ref(value);
  if (ref) ref.current = value;
}
function useNodeRef(setNode, innerRef) {
  return React.useCallback(
    (node) => {
      setNode(node);
      const cleanup = assign(innerRef, node);
      if (node)
        return () => {
          setNode(null);
          if (typeof cleanup === "function") cleanup();
          else assign(innerRef, null);
        };
    },
    [setNode, innerRef],
  );
}
function Reference({ children, innerRef }) {
  const setReference = React.useContext(SetReferenceContext);
  if (!setReference) throw new Error("Reference requires a Manager");
  const ref = useNodeRef(setReference, innerRef);
  return children({ ref });
}
function modifierOptions(modifiers) {
  const map = new Map();
  for (const m of modifiers || empty) {
    if (!m || typeof m.name !== "string")
      throw new TypeError("A named positioning modifier is required");
    if (m.fn || m.effect)
      throw new TypeError(
        "Custom Popper modifier callbacks are outside vreact-popper navigation scope",
      );
    if (
      ![
        "offset",
        "flip",
        "preventOverflow",
        "arrow",
        "hide",
        "eventListeners",
        "computeStyles",
      ].includes(m.name)
    )
      throw new TypeError("Unsupported positioning modifier: " + m.name);
    if (m.name === "computeStyles" && m.enabled === false)
      throw new TypeError(
        "Disabling computed styles is outside the navigation contract",
      );
    map.set(m.name, {
      ...map.get(m.name),
      ...m,
      options: { ...map.get(m.name)?.options, ...m.options },
    });
  }
  return map;
}
function middlewareFor(map, arrowElement) {
  const enabled = (name) => map.get(name)?.enabled !== false,
    opts = (name) => map.get(name)?.options || {},
    list = [];
  if (enabled("offset")) {
    const value = opts("offset").offset || [0, 0];
    list.push(
      floating.offset((state) => {
        const pair =
          typeof value === "function"
            ? value({
                placement: state.placement,
                reference: state.rects.reference,
                popper: state.rects.floating,
              })
            : value;
        return { crossAxis: pair[0] || 0, mainAxis: pair[1] || 0 };
      }),
    );
  }
  if (enabled("flip")) {
    const o = opts("flip");
    list.push(
      floating.flip({
        fallbackStrategy: "initialPlacement",
        fallbackPlacements: o.fallbackPlacements,
        flipAlignment: o.flipVariations,
        mainAxis: o.mainAxis,
        crossAxis: o.altAxis,
        padding: o.padding,
        boundary:
          o.boundary === "clippingParents" ? "clippingAncestors" : o.boundary,
        rootBoundary: o.rootBoundary,
      }),
    );
  }
  if (enabled("preventOverflow")) {
    const o = opts("preventOverflow");
    list.push(
      floating.shift({
        mainAxis: o.mainAxis,
        crossAxis: o.altAxis || false,
        padding: o.padding,
        boundary:
          o.boundary === "clippingParents" ? "clippingAncestors" : o.boundary,
        rootBoundary: o.rootBoundary,
        limiter: o.tether === false ? undefined : floating.limitShift(),
      }),
    );
  }
  if (enabled("arrow") && arrowElement)
    list.push(
      floating.arrow({
        element: arrowElement,
        padding: opts("arrow").padding || 0,
      }),
    );
  if (enabled("hide"))
    list.push(
      floating.hide({ strategy: "referenceHidden" }),
      floating.hide({ strategy: "escaped" }),
    );
  return list;
}
function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
function usePosition(reference, popper, options, arrowElement) {
  const {
    placement = "bottom",
    strategy = "absolute",
    modifiers = empty,
  } = options;
  if (!/^(top|bottom|left|right)(-(start|end))?$/.test(placement))
    throw new TypeError(
      "vreact-popper navigation requires an explicit side placement",
    );
  if (strategy !== "absolute" && strategy !== "fixed")
    throw new TypeError("Invalid positioning strategy");
  const map = modifierOptions(modifiers),
    [result, setResult] = React.useState(null),
    [failure, setFailure] = React.useState(null),
    config = React.useRef(),
    active = React.useRef(false),
    sequence = React.useRef(0),
    first = React.useRef(false),
    published = React.useRef(null),
    pair = React.useRef();
  // Keep callbacks current without tearing down observers on every render-prop call.
  const previous = React.useRef(modifiers);
  if (!compare(previous.current, modifiers)) previous.current = modifiers;
  const update = React.useCallback(() => {
    const c = config.current;
    if (!active.current || !c?.reference || !c?.popper)
      return Promise.resolve(null);
    const ticket = ++sequence.current;
    return floating
      .computePosition(c.reference, c.popper, {
        placement: c.placement,
        strategy: c.strategy,
        middleware: middlewareFor(c.map, c.arrow),
        platform: { isRTL: () => false },
      })
      .then((position) => {
        if (
          !active.current ||
          ticket !== sequence.current ||
          config.current.reference !== c.reference ||
          config.current.popper !== c.popper
        )
          return null;
        const dpr = c.popper.ownerDocument.defaultView?.devicePixelRatio || 1,
          round = c.map.get("computeStyles")?.options?.roundOffsets;
        let xy =
          typeof round === "function"
            ? round({ x: position.x, y: position.y })
            : round === false
              ? position
              : {
                  x: Math.round(position.x * dpr) / dpr,
                  y: Math.round(position.y * dpr) / dpr,
                };
        const arrow = position.middlewareData.arrow,
          hide = position.middlewareData.hide || {},
          gpu = c.map.get("computeStyles")?.options?.gpuAcceleration !== false;
        const style = gpu
          ? {
              position: c.strategy,
              left: 0,
              top: 0,
              transform: `translate(${xy.x}px, ${xy.y}px)`,
            }
          : { position: c.strategy, left: xy.x, top: xy.y, transform: "" };
        const arrowStyle = {
          position: "absolute",
          ...(arrow?.x === undefined ? {} : { left: arrow.x }),
          ...(arrow?.y === undefined ? {} : { top: arrow.y }),
        };
        const next = {
          placement: position.placement,
          styles: { popper: style, arrow: arrowStyle },
          attributes: {
            popper: {
              "data-popper-placement": position.placement,
              ...(hide.referenceHidden
                ? { "data-popper-reference-hidden": "" }
                : {}),
              ...(hide.escaped ? { "data-popper-escaped": "" } : {}),
            },
          },
          isReferenceHidden: !!hide.referenceHidden,
          hasPopperEscaped: !!hide.escaped,
        };
        if (!same(published.current, next)) {
          published.current = next;
          setResult(next);
        }
        if (!first.current) {
          first.current = true;
          config.current.onFirstUpdate?.(next);
        }
        return next;
      })
      .catch((error) => {
        if (active.current && ticket === sequence.current) setFailure(error);
        return null;
      });
  }, []);
  commit(() => {
    config.current = {
      reference,
      popper,
      placement,
      strategy,
      map,
      arrow: arrowElement,
      onFirstUpdate: options.onFirstUpdate,
    };
  });
  commit(() => {
    active.current = true;
    return () => {
      active.current = false;
      sequence.current++;
    };
  }, []);
  commit(() => {
    if (!reference || !popper) {
      sequence.current++;
      return;
    }
    if (pair.current?.[0] !== reference || pair.current?.[1] !== popper) {
      first.current = false;
      pair.current = [reference, popper];
    }
    const events = map.get("eventListeners"),
      enabled = events?.enabled !== false;
    const cleanup = floating.autoUpdate(reference, popper, update, {
      ancestorScroll: enabled && events?.options?.scroll !== false,
      ancestorResize: enabled && events?.options?.resize !== false,
      elementResize: enabled,
      layoutShift: enabled,
    });
    return () => {
      sequence.current++;
      cleanup();
    };
  }, [
    reference,
    popper,
    placement,
    strategy,
    previous.current,
    arrowElement,
    update,
  ]);
  if (failure) throw failure;
  const fallback = {
    placement,
    styles: {
      popper: { position: strategy, left: 0, top: 0 },
      arrow: { position: "absolute" },
    },
    attributes: {},
    isReferenceHidden: false,
    hasPopperEscaped: false,
  };
  return { ...(result || fallback), update };
}
function Popper({
  children,
  innerRef,
  referenceElement,
  placement = "bottom",
  strategy = "absolute",
  modifiers = empty,
  onFirstUpdate,
}) {
  const managed = React.useContext(ReferenceContext),
    [element, setElement] = React.useState(null),
    [arrow, setArrow] = React.useState(null),
    ref = useNodeRef(setElement, innerRef);
  const positioned = usePosition(
    referenceElement || managed,
    element,
    { placement, strategy, modifiers, onFirstUpdate },
    arrow,
  );
  return children({
    ref,
    style: positioned.styles.popper,
    placement: positioned.placement,
    arrowProps: { ref: setArrow, style: positioned.styles.arrow },
    update: positioned.update,
    isReferenceHidden: positioned.isReferenceHidden,
    hasPopperEscaped: positioned.hasPopperEscaped,
  });
}
module.exports = { Manager, Reference, Popper };
