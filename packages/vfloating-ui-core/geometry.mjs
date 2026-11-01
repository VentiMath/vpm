import {getSide, getSideAxis, getAlignment, rectToClientRect} from 'vfloating-ui-utils';

export function computeCoordsFromPlacement(rects, placement, rtl) {
  const r = rects.reference, f = rects.floating;
  const vertical = getSideAxis(placement) === 'y', side = getSide(placement);
  let x = r.x, y = r.y;
  if (side === 'top' || side === 'bottom') {
    x += (r.width - f.width) / 2;
    y += side === 'top' ? -f.height : r.height;
  } else if (side === 'left' || side === 'right') {
    y += (r.height - f.height) / 2;
    x += side === 'left' ? -f.width : r.width;
  }
  const alignment = getAlignment(placement);
  if (alignment) {
    const direction = (alignment === 'end' ? 1 : -1) * (vertical && rtl ? -1 : 1);
    if (vertical) x += (r.width - f.width) / 2 * direction;
    else y += (r.height - f.height) / 2 * direction;
  }
  return {x, y};
}

export function bounds(rects) {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const rect of rects) {
    left = Math.min(left, rect.left); top = Math.min(top, rect.top);
    right = Math.max(right, rect.right); bottom = Math.max(bottom, rect.bottom);
  }
  return rectToClientRect({x: left, y: top, width: right - left, height: bottom - top});
}

export function getRectsByLine(rects) {
  const ordered = rects.slice().sort((a, b) => a.y - b.y), lines = [];
  let previous;
  for (const rect of ordered) {
    if (!previous || rect.y - previous.y > previous.height / 2) lines.push(bounds([rect]));
    else lines[lines.length - 1] = bounds([lines[lines.length - 1], rect]);
    previous = rect;
  }
  return lines;
}
