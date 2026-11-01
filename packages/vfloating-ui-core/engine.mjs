import {evaluate, getPaddingObject, rectToClientRect} from 'vfloating-ui-utils';
import {computeCoordsFromPlacement} from './geometry.mjs';

export async function detectOverflow(state, options = {}) {
  const {boundary = 'clippingAncestors', rootBoundary = 'viewport', elementContext = 'floating', altBoundary = false, padding = 0} = evaluate(options, state);
  const {platform, elements, rects, strategy} = state;
  const selected = altBoundary ? (elementContext === 'floating' ? 'reference' : 'floating') : elementContext;
  let element = elements[selected];
  if ((await platform.isElement?.(element)) === false) element = element.contextElement || await platform.getDocumentElement?.(elements.floating);
  const clip = rectToClientRect(await platform.getClippingRect({element, boundary, rootBoundary, strategy}));
  const rect = elementContext === 'reference' ? rects.reference : {x: state.x, y: state.y, width: rects.floating.width, height: rects.floating.height};
  const offsetParent = await platform.getOffsetParent?.(elements.floating);
  const scale = (await platform.isElement?.(offsetParent)) && await platform.getScale?.(offsetParent) || {x: 1, y: 1};
  const viewport = rectToClientRect(platform.convertOffsetParentRelativeRectToViewportRelativeRect
    ? await platform.convertOffsetParentRelativeRectToViewportRelativeRect({elements, rect, offsetParent, strategy}) : rect);
  const pad = getPaddingObject(padding);
  return {top: (clip.top - viewport.top + pad.top) / scale.y, right: (viewport.right - clip.right + pad.right) / scale.x,
    bottom: (viewport.bottom - clip.bottom + pad.bottom) / scale.y, left: (clip.left - viewport.left + pad.left) / scale.x};
}

export async function computePosition(reference, floating, config) {
  const {platform, placement: initialPlacement = 'bottom', strategy = 'absolute'} = config;
  // Capture the execution plan before the first await. Caller mutation must not
  // append work to an active computation or change its reset lifecycle.
  const steps = (config.middleware || []).filter(Boolean).map(({name, fn}) => ({name, fn}));
  const context = platform.detectOverflow ? platform : Object.create(platform, {detectOverflow: {value: detectOverflow}});
  const rtl = await platform.isRTL?.(floating);
  const elements = {reference, floating}, measure = () => platform.getElementRects({...elements, strategy});
  let rects = await measure(), placement = initialPlacement, coords = computeCoordsFromPlacement(rects, placement, rtl), resets = 0, index = 0;
  const middlewareData = {};
  while (index < steps.length) {
    const {name, fn} = steps[index++];
    const result = await fn({...coords, initialPlacement, placement, strategy, middlewareData, rects, platform: context, elements});
    coords = {x: result.x ?? coords.x, y: result.y ?? coords.y};
    const prior = Object.hasOwn(middlewareData, name) ? middlewareData[name] : undefined;
    // Define an own property even for '__proto__'; never invoke a prototype setter.
    Object.defineProperty(middlewareData, name, {value: {...prior, ...result.data}, enumerable: true, configurable: true, writable: true});
    if (!result.reset || resets === 50) continue;
    resets++;
    if (typeof result.reset === 'object') {
      placement = result.reset.placement || placement;
      if (result.reset.rects) rects = result.reset.rects === true ? await measure() : result.reset.rects;
      coords = computeCoordsFromPlacement(rects, placement, rtl);
    }
    index = 0;
  }
  return {...coords, placement, strategy, middlewareData};
}
