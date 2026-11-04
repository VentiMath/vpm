'use client';
'use strict';

const React = require('react');
const JSX = require('react/jsx-runtime');
const Floating = require('vfloating-ui-react-dom');
const { Primitive } = require('vradix-react-primitive');
const { Arrow: Triangle } = require('vradix-react-arrow');
const { createContextScope } = require('vradix-react-context');
const { useComposedRefs } = require('vradix-react-compose-refs');
const { useLayoutEffect } = require('vradix-react-use-layout-effect');
const { useCallbackRef } = require('vradix-react-use-callback-ref');
const { useSize } = require('vradix-react-use-size');

const SIDE_OPTIONS = ['top', 'right', 'bottom', 'left'];
const ALIGN_OPTIONS = ['start', 'center', 'end'];
const [context, createPopperScope] = createContextScope('Popper');
const [AnchorProvider, useAnchor] = context('Popper');
const [ArrowProvider, useArrow] = context('PopperContent');
const noBoundaries = [];

function Popper({ children, __scopePopper }) {
  const [anchor, setAnchor] = React.useState(null);
  const [placement, setPlacement] = React.useState();
  return JSX.jsx(AnchorProvider, { scope: __scopePopper, anchor, setAnchor, placement, setPlacement, children });
}

const PopperAnchor = React.forwardRef(function PopperAnchor({ virtualRef, __scopePopper, ...props }, forwardedRef) {
  const { setAnchor, placement } = useAnchor('PopperAnchor', __scopePopper);
  const owned = React.useRef(null);
  const publish = React.useCallback(node => {
    const previous = owned.current;
    owned.current = node;
    // A departing anchor must not clear a different anchor that replaced it.
    setAnchor(current => node || (current === previous ? null : current));
  }, [setAnchor]);
  const domRef = React.useCallback(node => { if (!virtualRef) publish(node); }, [virtualRef, publish]);
  const ref = useComposedRefs(forwardedRef, domRef);
  useLayoutEffect(() => {
    if (virtualRef && owned.current !== virtualRef.current) publish(virtualRef.current);
  });
  useLayoutEffect(() => () => publish(null), [publish]);
  if (virtualRef) return null;
  const [side, align = 'center'] = placement?.split('-') ?? [];
  return JSX.jsx(Primitive.div, {
    'data-radix-popper-side': side,
    'data-radix-popper-align': side ? align : undefined,
    ...props, ref,
  });
});

function publishDimensions({ elements, rects, availableWidth, availableHeight }) {
  const style = elements.floating.style;
  const values = [availableWidth, availableHeight, rects.reference.width, rects.reference.height];
  const names = ['available-width', 'available-height', 'anchor-width', 'anchor-height'];
  for (let i = 0; i < names.length; i++) {
    const key = '--radix-popper-' + names[i], value = values[i] + 'px';
    if (style.getPropertyValue(key) !== value) style.setProperty(key, value);
  }
}

function origin(width, height) {
  return {
    name: 'transformOrigin', options: { width, height },
    fn({ placement, rects, middlewareData }) {
      const [side, align = 'center'] = placement.split('-');
      const vertical = side === 'top' || side === 'bottom';
      const visible = middlewareData.arrow?.centerOffset === 0;
      const distance = visible ? height : 0;
      const cross = visible
        ? ((vertical ? middlewareData.arrow.x : middlewareData.arrow.y) ?? 0) + (vertical ? width : height) / 2 + 'px'
        : ({ start: '0%', center: '50%', end: '100%' })[align];
      const along = (side === 'bottom' || side === 'right' ? -distance : (vertical ? rects.floating.height : rects.floating.width) + distance) + 'px';
      return { data: vertical ? { x: cross, y: along } : { x: along, y: cross } };
    },
  };
}

const PopperContent = React.forwardRef(function PopperContent({
  __scopePopper, side = 'bottom', align = 'center', sideOffset = 0, alignOffset = 0,
  arrowPadding = 0, avoidCollisions = true, collisionBoundary = noBoundaries,
  collisionPadding = 0, sticky = 'partial', hideWhenDetached = false,
  updatePositionStrategy = 'optimized', onPlaced, ...props
}, forwardedRef) {
  const { anchor, setPlacement } = useAnchor('PopperContent', __scopePopper);
  const [content, setContent] = React.useState(null);
  const contentRef = useComposedRefs(forwardedRef, setContent);
  const [arrow, setArrow] = React.useState(null);
  const dimensions = useSize(arrow);
  const width = dimensions?.width ?? 0, height = dimensions?.height ?? 0;
  const middleware = React.useMemo(() => {
    const boundary = Array.isArray(collisionBoundary) ? collisionBoundary : [collisionBoundary];
    const explicit = boundary.length > 0;
    const overflow = { boundary: boundary.filter(item => item !== null), padding: collisionPadding, altBoundary: explicit };
    const chain = [Floating.offset({ mainAxis: sideOffset + height, alignmentAxis: alignOffset })];
    if (avoidCollisions) {
      chain.push(Floating.shift({ ...overflow, mainAxis: true, crossAxis: false, ...(sticky === 'partial' ? { limiter: Floating.limitShift() } : {}) }));
      chain.push(Floating.flip(overflow));
    }
    chain.push(Floating.size({ ...overflow, apply: publishDimensions }));
    if (arrow) chain.push(Floating.arrow({ element: arrow, padding: arrowPadding }));
    chain.push(origin(width, height));
    if (hideWhenDetached) chain.push(Floating.hide(explicit
      ? { ...overflow, strategy: 'referenceHidden' }
      : { padding: collisionPadding, altBoundary: false, strategy: 'referenceHidden' }));
    return chain;
  }, [collisionBoundary, collisionPadding, sideOffset, alignOffset, avoidCollisions, sticky, arrow, arrowPadding, width, height, hideWhenDetached]);
  const positioned = Floating.useFloating({
    strategy: 'fixed', placement: align === 'center' ? side : side + '-' + align,
    elements: { reference: anchor }, middleware, open: !!anchor,
  });
  // Own subscriptions separately from middleware comparison. Changing the
  // update policy reliably replaces the observer/animation-frame subscription.
  useLayoutEffect(() => {
    if (anchor && positioned.elements.floating) return Floating.autoUpdate(anchor, positioned.elements.floating, positioned.update, {
      animationFrame: updatePositionStrategy === 'always',
    });
  }, [anchor, positioned.elements.floating, positioned.update, updatePositionStrategy]);
  useLayoutEffect(() => { setPlacement(positioned.placement); }, [setPlacement, positioned.placement]);
  useLayoutEffect(() => () => setPlacement(undefined), [setPlacement]);

  const ready = !!anchor && positioned.isPositioned;
  const notify = useCallbackRef(onPlaced);
  useLayoutEffect(() => { if (ready) notify(); }, [ready, notify]);
  const [zIndex, setZIndex] = React.useState();
  useLayoutEffect(() => {
    if (content) setZIndex(content.ownerDocument.defaultView.getComputedStyle(content).zIndex);
  }, [content, props.style?.zIndex]);

  const [placedSide, placedAlign = 'center'] = positioned.placement.split('-');
  const data = positioned.middlewareData;
  const hidden = !anchor || data.hide?.referenceHidden;
  const style = {
    ...positioned.floatingStyles,
    transform: ready ? positioned.floatingStyles.transform : 'translate(0, -200%)',
    minWidth: 'max-content', zIndex,
    '--radix-popper-transform-origin': [data.transformOrigin?.x, data.transformOrigin?.y].join(' '),
    ...(hidden ? { visibility: 'hidden', pointerEvents: 'none' } : {}),
  };
  return JSX.jsx('div', {
    ref: positioned.refs.setFloating, 'data-radix-popper-content-wrapper': '', style, dir: props.dir,
    children: JSX.jsx(ArrowProvider, {
      scope: __scopePopper, side: placedSide, x: data.arrow?.x, y: data.arrow?.y,
      hidden: data.arrow?.centerOffset !== 0, setArrow,
      children: JSX.jsx(Primitive.div, {
        'data-side': placedSide, 'data-align': placedAlign, ...props, ref: contentRef,
        style: { ...props.style, animation: ready ? props.style?.animation : 'none' },
      }),
    }),
  });
});

const arrowPlacement = {
  top: { bottom: 0, transform: 'translateY(100%)', transformOrigin: '' },
  right: { left: 0, transform: 'translateY(50%) rotate(90deg) translateX(-50%)', transformOrigin: '0 0' },
  bottom: { top: 0, transform: 'rotate(180deg)', transformOrigin: 'center 0' },
  left: { right: 0, transform: 'translateY(50%) rotate(-90deg) translateX(50%)', transformOrigin: '100% 0' },
};
const PopperArrow = React.forwardRef(function PopperArrow({ __scopePopper, ...props }, ref) {
  const arrow = useArrow('PopperArrow', __scopePopper);
  return JSX.jsx('span', {
    ref: arrow.setArrow,
    style: { position: 'absolute', left: arrow.x, top: arrow.y, ...arrowPlacement[arrow.side], visibility: arrow.hidden ? 'hidden' : undefined },
    children: JSX.jsx(Triangle, { ...props, ref, style: { ...props.style, display: 'block' } }),
  });
});

module.exports = { Popper, PopperAnchor, PopperContent, PopperArrow, Root: Popper, Anchor: PopperAnchor, Content: PopperContent, Arrow: PopperArrow, createPopperScope, SIDE_OPTIONS, ALIGN_OPTIONS };
