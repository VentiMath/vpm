import * as React from 'react';
import {flushSync} from 'react-dom';
import * as dom from 'vfloating-ui-dom';
import {equivalent} from './equivalent.mjs';

export {autoUpdate, computePosition, detectOverflow, getOverflowAncestors, platform} from 'vfloating-ui-dom';

// Dependencies belong to the React comparison contract; DOM middleware consumes
// the original options, so the wrapper never changes its geometry arguments.
function reactive(factory) {
  return (options, dependencies) => ({...factory(options), options: [options, dependencies]});
}
export const offset = reactive(dom.offset);
export const shift = reactive(dom.shift);
export const limitShift = reactive(dom.limitShift);
export const flip = reactive(dom.flip);
export const size = reactive(dom.size);
export const autoPlacement = reactive(dom.autoPlacement);
export const hide = reactive(dom.hide);
export const inline = reactive(dom.inline);
export const arrow = reactive(options => ({
  name: 'arrow',
  async fn(state) {
    const resolved = typeof options === 'function' ? options(state) : options;
    let element = resolved.element;
    if (element && Object.prototype.hasOwnProperty.call(element, 'current')) element = element.current;
    return element ? dom.arrow({...resolved, element}).fn(state) : {};
  },
}));

const useCommit = typeof document === 'undefined' ? React.useEffect : React.useLayoutEffect;
const empty = [];

export function useFloating(options = {}) {
  const {placement = 'bottom', strategy = 'absolute', transform = true, open,
    middleware = empty, platform, whileElementsMounted} = options;
  const [reference, setReferenceState] = React.useState(null);
  const [floating, setFloatingState] = React.useState(null);
  const referenceRef = React.useRef(null);
  const floatingRef = React.useRef(null);
  const nodes = {
    reference: options.elements?.reference || reference,
    floating: options.elements?.floating || floating,
  };
  const [data, setData] = React.useState(() => ({
    x: 0, y: 0, placement, strategy, middlewareData: {}, isPositioned: false,
  }));
  const published = React.useRef(data);
  const active = React.useRef(false);
  const sequence = React.useRef(0);
  const configuration = React.useRef(null);
  const previousMiddleware = React.useRef(middleware);
  if (!equivalent(previousMiddleware.current, middleware)) previousMiddleware.current = middleware;
  const stableMiddleware = previousMiddleware.current;

  const setReference = React.useCallback(node => {
    referenceRef.current = node;
    setReferenceState(node);
  }, []);
  const setFloating = React.useCallback(node => {
    floatingRef.current = node;
    setFloatingState(node);
  }, []);
  const update = React.useCallback(() => {
    const reference = referenceRef.current, floating = floatingRef.current;
    const config = configuration.current;
    if (!active.current || !reference || !floating || !config) return;
    const ticket = ++sequence.current;
    dom.computePosition(reference, floating, {
      placement: config.placement, strategy: config.strategy,
      middleware: config.middleware, ...(config.platform ? {platform: config.platform} : {}),
    }).then(position => {
      // Measurements can await custom platforms or middleware. Only the newest
      // request for the still-mounted pair may publish its result.
      if (!active.current || ticket !== sequence.current ||
          referenceRef.current !== reference || floatingRef.current !== floating) return;
      const next = {...position, isPositioned: configuration.current.open !== false};
      if (!equivalent(published.current, next)) {
        published.current = next;
        flushSync(() => setData(next));
      }
    });
  }, []);

  useCommit(() => {
    active.current = true;
    return () => { active.current = false; sequence.current++; };
  }, []);
  useCommit(() => {
    configuration.current = {placement, strategy, middleware, platform, open, whileElementsMounted};
  });
  const lastOpen = React.useRef(open);
  useCommit(() => {
    if (lastOpen.current === open) return;
    lastOpen.current = open;
    sequence.current++;
    if (open === false && published.current.isPositioned) {
      const next = {...published.current, isPositioned: false};
      published.current = next;
      setData(next);
    } else if (open !== false) update();
  }, [open, update]);
  useCommit(() => {
    referenceRef.current = nodes.reference;
    floatingRef.current = nodes.floating;
    if (!nodes.reference || !nodes.floating) return;
    const mount = configuration.current.whileElementsMounted;
    let cleanup;
    if (mount) cleanup = mount(nodes.reference, nodes.floating, update);
    else update();
    return () => { sequence.current++; cleanup?.(); };
  }, [nodes.reference, nodes.floating, placement, strategy, stableMiddleware, platform, !!whileElementsMounted, update]);

  const refs = React.useMemo(() => ({reference: referenceRef, floating: floatingRef, setReference, setFloating}), [setReference, setFloating]);
  const elements = React.useMemo(() => nodes, [nodes.reference, nodes.floating]);
  const floatingStyles = React.useMemo(() => {
    const base = {position: strategy, left: 0, top: 0};
    if (!nodes.floating) return base;
    const dpr = nodes.floating.ownerDocument?.defaultView?.devicePixelRatio || 1;
    const x = Math.round(data.x * dpr) / dpr, y = Math.round(data.y * dpr) / dpr;
    return transform ? {...base, transform: `translate(${x}px, ${y}px)`, ...(dpr >= 1.5 ? {willChange: 'transform'} : {})}
      : {...base, left: x, top: y};
  }, [strategy, transform, nodes.floating, data.x, data.y]);
  return React.useMemo(() => ({...data, refs, elements, floatingStyles, update}), [data, refs, elements, floatingStyles, update]);
}
