import {evaluate, placements, getAlignment, getAlignmentSides, getSide, getSideAxis, getOppositePlacement, getExpandedPlacements, getOppositeAxisPlacements} from 'vfloating-ui-utils';

function least(items, score, eligible = () => true) {
  let selected, minimum;
  for (const item of items) {
    if (!eligible(item)) continue;
    const value = score(item);
    if (!selected || value < minimum) {selected = item; minimum = value;}
  }
  return selected?.placement;
}

export function flip(options = {}) {
  return {name: 'flip', options, async fn(state) {
    const {mainAxis = true, crossAxis = true, fallbackPlacements, fallbackStrategy = 'bestFit', fallbackAxisSideDirection = 'none', flipAlignment = true, ...overflowOptions} = evaluate(options, state);
    if (state.middlewareData.arrow?.alignmentOffset) return {};
    const initial = state.initialPlacement, initialAxis = getSideAxis(initial), rtl = await state.platform.isRTL?.(state.elements.floating);
    const fallback = fallbackPlacements ? [...fallbackPlacements] : getAlignment(initial) && flipAlignment ? getExpandedPlacements(initial) : [getOppositePlacement(initial)];
    const changeAxis = fallbackAxisSideDirection !== 'none';
    if (!fallbackPlacements && changeAxis) fallback.push(...getOppositeAxisPlacements(initial, flipAlignment, fallbackAxisSideDirection, rtl));
    const overflow = await state.platform.detectOverflow(state, overflowOptions), checks = [];
    if (mainAxis) checks.push(overflow[getSide(state.placement)]);
    if (crossAxis) for (const side of getAlignmentSides(state.placement, state.rects, rtl)) checks.push(overflow[side]);
    if (checks.every(value => value <= 0)) return {};
    const history = [...(state.middlewareData.flip?.overflows || []), {placement: state.placement, overflows: checks}];
    const index = (state.middlewareData.flip?.index || 0) + 1, next = fallback[index - 1];
    if (next && (crossAxis !== 'alignment' || initialAxis === getSideAxis(next) || history.every(item => getSideAxis(item.placement) !== initialAxis || item.overflows[0] > 0))) {
      return {data: {index, overflows: history}, reset: {placement: next}};
    }
    let chosen = least(history, item => item.overflows[1], item => item.overflows[0] <= 0);
    if (!chosen && fallbackStrategy === 'initialPlacement') chosen = initial;
    if (!chosen && fallbackStrategy === 'bestFit') chosen = least(history, item => item.overflows.reduce((sum, value) => sum + Math.max(0, value), 0),
      item => !changeAxis || getSideAxis(item.placement) === initialAxis || getSideAxis(item.placement) === 'y');
    return chosen !== state.placement ? {reset: {placement: chosen}} : {};
  }};
}

export function getPlacementList(alignment, autoAlignment, allowed) {
  if (!alignment) return allowed.filter(p => !getAlignment(p));
  const preferred = [], other = [];
  for (const p of allowed) {
    const a = getAlignment(p);
    if (a === alignment) preferred.push(p);
    else if (autoAlignment && a) other.push(p);
  }
  return preferred.concat(other);
}

export function autoPlacement(options = {}) {
  return {name: 'autoPlacement', options, async fn(state) {
    const {alignment, autoAlignment = true, allowedPlacements = placements, crossAxis = false, ...overflowOptions} = evaluate(options, state);
    const candidates = alignment !== undefined || allowedPlacements === placements ? getPlacementList(alignment || null, autoAlignment, allowedPlacements) : allowedPlacements;
    const index = state.middlewareData.autoPlacement?.index || 0, current = candidates[index];
    if (current == null) return {};
    if (state.placement !== current) return {reset: {placement: candidates[0]}};
    const overflow = await state.platform.detectOverflow(state, overflowOptions), sides = getAlignmentSides(current, state.rects, await state.platform.isRTL?.(state.elements.floating));
    const history = [...(state.middlewareData.autoPlacement?.overflows || []), {placement: current, overflows: [overflow[getSide(current)], overflow[sides[0]], overflow[sides[1]]]}];
    const data = {index: index + 1, overflows: history};
    if (candidates[index + 1]) return {data, reset: {placement: candidates[index + 1]}};
    const score = item => item.overflows[0] + (getAlignment(item.placement) && crossAxis ? item.overflows[1] : 0);
    const fits = item => item.overflows.slice(0, getAlignment(item.placement) ? 2 : 3).every(value => value <= 0);
    const chosen = least(history, score, fits) || least(history, score);
    return chosen !== current ? {data, reset: {placement: chosen}} : {};
  }};
}
