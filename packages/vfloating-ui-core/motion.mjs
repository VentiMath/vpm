import {evaluate, getSide, getSideAxis, getAlignment, getPaddingObject, clamp} from 'vfloating-ui-utils';
const negativeSide = side => side === 'top' || side === 'left';
const oppositeAxis = axis => axis === 'x' ? 'y' : 'x';
const lengthOf = axis => axis === 'x' ? 'width' : 'height';
const edges = axis => axis === 'x' ? ['left', 'right'] : ['top', 'bottom'];

export function offset(options = 0) {
  return {name: 'offset', options, async fn(state) {
    const rtl = await state.platform.isRTL?.(state.elements.floating);
    const input = evaluate(options, state), align = getAlignment(state.placement);
    const main = typeof input === 'number' ? input : input.mainAxis || 0;
    let cross = typeof input === 'number' ? 0 : input.crossAxis || 0;
    if (align && typeof input.alignmentAxis === 'number') cross = input.alignmentAxis * (align === 'end' ? -1 : 1);
    const vertical = getSideAxis(state.placement) === 'y', distance = main * (negativeSide(getSide(state.placement)) ? -1 : 1);
    const x = vertical ? cross * (rtl ? -1 : 1) : distance, y = vertical ? distance : cross;
    if (state.middlewareData.offset?.placement === state.placement && state.middlewareData.arrow?.alignmentOffset) return {};
    return {x: state.x + x, y: state.y + y, data: {x, y, placement: state.placement}};
  }};
}

export function shift(options = {}) {
  return {name: 'shift', options, async fn(state) {
    const {mainAxis = true, crossAxis = false, limiter, ...overflowOptions} = evaluate(options, state);
    const overflow = await state.platform.detectOverflow(state, overflowOptions);
    const cross = getSideAxis(state.placement), main = oppositeAxis(cross), next = {x: state.x, y: state.y};
    for (const [axis, enabled] of [[main, mainAxis], [cross, crossAxis]]) if (enabled) {
      const [low, high] = edges(axis), value = next[axis];
      next[axis] = clamp(value + overflow[low], value, value - overflow[high]);
    }
    const limited = limiter ? limiter.fn({...state, ...next}) : next;
    return {...limited, data: {x: limited.x - state.x, y: limited.y - state.y, enabled: {[main]: mainAxis, [cross]: crossAxis}}};
  }};
}

export function limitShift(options = {}) {
  return {options, fn(state) {
    const {mainAxis = true, crossAxis = true, offset = 0} = evaluate(options, state);
    const input = evaluate(offset, state), mainOffset = typeof input === 'number' ? input : input.mainAxis ?? 0,
      crossOffset = typeof input === 'number' ? 0 : input.crossAxis ?? 0;
    const cross = getSideAxis(state.placement), main = oppositeAxis(cross), {reference: r, floating: f} = state.rects;
    const result = {x: state.x, y: state.y};
    const constrain = (axis, low, high) => {if (result[axis] < low) result[axis] = low; else if (result[axis] > high) result[axis] = high;};
    if (mainAxis) constrain(main, r[main] - f[lengthOf(main)] + mainOffset, r[main] + r[lengthOf(main)] - mainOffset);
    if (crossAxis) {
      const origin = negativeSide(getSide(state.placement)), gutter = state.middlewareData.offset?.[cross] || 0;
      constrain(cross, r[cross] - f[lengthOf(cross)] + (origin ? gutter : crossOffset), r[cross] + r[lengthOf(cross)] + (origin ? -crossOffset : gutter));
    }
    return result;
  }};
}

export function arrow(options) {
  return {name: 'arrow', options, async fn(state) {
    const {element, padding = 0} = evaluate(options, state) || {};
    if (element == null) return {};
    const axis = oppositeAxis(getSideAxis(state.placement)), len = lengthOf(axis), [low, high] = edges(axis);
    const dimensions = await state.platform.getDimensions(element), parent = await state.platform.getOffsetParent?.(element);
    const clientKey = axis === 'x' ? 'clientWidth' : 'clientHeight';
    let client = parent?.[clientKey];
    if (!client || !(await state.platform.isElement?.(parent))) client = state.elements.floating[clientKey] || state.rects.floating[len];
    const pad = getPaddingObject(padding), halfArrow = dimensions[len] / 2;
    const lowPadding = Math.min(pad[low], client / 2 - halfArrow - 1), highPadding = Math.min(pad[high], client / 2 - halfArrow - 1);
    const r = state.rects.reference, f = state.rects.floating;
    const correction = (r[len] + r[axis] - state[axis] - f[len]) / 2 - (state[axis] - r[axis]) / 2;
    const center = client / 2 - halfArrow + correction, maximum = client - dimensions[len] - highPadding;
    const position = clamp(lowPadding, center, maximum);
    const needsAlignment = !state.middlewareData.arrow && getAlignment(state.placement) != null && center !== position && r[len] / 2 - (center < lowPadding ? lowPadding : highPadding) - halfArrow < 0;
    const adjustment = needsAlignment ? center - (center < lowPadding ? lowPadding : maximum) : 0;
    return {[axis]: state[axis] + adjustment, data: {[axis]: position, centerOffset: center - position - adjustment, ...(needsAlignment ? {alignmentOffset: adjustment} : {})}, reset: needsAlignment};
  }};
}
