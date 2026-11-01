import {evaluate, getSide, getSideAxis, getAlignment, getPaddingObject, rectToClientRect} from 'vfloating-ui-utils';
import {bounds, getRectsByLine} from './geometry.mjs';

export function size(options = {}) {
  return {name: 'size', options, async fn(state) {
    const {apply, ...overflowOptions} = evaluate(options, state), overflow = await state.platform.detectOverflow(state, overflowOptions);
    const {width, height} = state.rects.floating, side = getSide(state.placement), alignment = getAlignment(state.placement), vertical = getSideAxis(state.placement) === 'y';
    const widthEdge = vertical ? (alignment === (await state.platform.isRTL?.(state.elements.floating) ? 'start' : 'end') ? 'left' : 'right') : side;
    const heightEdge = vertical ? side : alignment === 'end' ? 'top' : 'bottom';
    const clipWidth = width - overflow.left - overflow.right, clipHeight = height - overflow.top - overflow.bottom, shifted = state.middlewareData.shift;
    let availableWidth = shifted?.enabled.x ? clipWidth : Math.min(width - overflow[widthEdge], clipWidth);
    let availableHeight = shifted?.enabled.y ? clipHeight : Math.min(height - overflow[heightEdge], clipHeight);
    if (!shifted && !alignment) {
      if (vertical) availableWidth = width - 2 * Math.max(overflow.left, overflow.right);
      else availableHeight = height - 2 * Math.max(overflow.top, overflow.bottom);
    }
    await apply?.({...state, availableWidth, availableHeight});
    const changed = await state.platform.getDimensions(state.elements.floating);
    return changed.width === width && changed.height === height ? {} : {reset: {rects: true}};
  }};
}

export function hide(options = {}) {
  return {name: 'hide', options, async fn(state) {
    const {strategy = 'referenceHidden', ...overflowOptions} = evaluate(options, state);
    if (strategy !== 'referenceHidden' && strategy !== 'escaped') return {};
    const reference = strategy === 'referenceHidden';
    const overflow = await state.platform.detectOverflow(state, {...overflowOptions, ...(reference ? {elementContext: 'reference'} : {altBoundary: true})});
    const rect = state.rects[reference ? 'reference' : 'floating'];
    const offsets = {top: overflow.top - rect.height, right: overflow.right - rect.width, bottom: overflow.bottom - rect.height, left: overflow.left - rect.width};
    return {data: {[strategy + 'Offsets']: offsets, [strategy]: Object.values(offsets).some(value => value >= 0)}};
  }};
}

export function inline(options = {}) {
  return {name: 'inline', options, async fn(state) {
    const {padding = 2, x, y} = evaluate(options, state);
    const native = Array.from(await state.platform.getClientRects?.(state.elements.reference) || []);
    if (native.length === 0) return {};
    const lines = getRectsByLine(native), fallback = bounds(native), pad = getPaddingObject(padding);
    let selected = fallback;
    const disjoint = lines.length === 2 && (lines[0].left > lines[1].right || lines[1].left > lines[0].right);
    if (disjoint && x != null && y != null) {
      selected = lines.find(rect => x > rect.left - pad.left && x < rect.right + pad.right && y > rect.top - pad.top && y < rect.bottom + pad.bottom) || fallback;
    } else if (lines.length >= 2) {
      const side = getSide(state.placement);
      if (getSideAxis(state.placement) === 'y') {
        const edge = side === 'top' ? lines[0] : lines[lines.length - 1];
        selected = rectToClientRect({x: edge.left, y: lines[0].top, width: edge.right - edge.left, height: lines[lines.length - 1].bottom - lines[0].top});
      } else {
        const extent = bounds(lines), edge = side === 'left' ? 'left' : 'right';
        let first, last;
        for (const line of lines) if (line[edge] === extent[edge]) {first ||= line; last = line;}
        selected = rectToClientRect({x: extent.left, y: first.top, width: extent.width, height: last.bottom - first.top});
      }
    }
    const rects = await state.platform.getElementRects({reference: {getBoundingClientRect: () => selected}, floating: state.elements.floating, strategy: state.strategy});
    const before = state.rects.reference, after = rects.reference;
    return before.x === after.x && before.y === after.y && before.width === after.width && before.height === after.height ? {} : {reset: {rects}};
  }};
}
