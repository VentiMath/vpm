// Independent placement helpers for the Floating UI 0.2.12 contract.
export const sides = ['top', 'right', 'bottom', 'left'];
export const alignments = ['start', 'end'];
export const placements = sides.flatMap(side => [side, `${side}-start`, `${side}-end`]);
export const {min, max, round, floor} = Math;
export const createCoords = value => ({x: value, y: value});
export const clamp = (lower, value, upper) => Math.max(lower, Math.min(value, upper));
export const evaluate = (value, argument) => typeof value === 'function' ? value(argument) : value;
export function getSide(value) {
  const separator = value.indexOf('-');
  return separator < 0 ? value : value.slice(0, separator);
}
export function getAlignment(value) {
  const separator = value.indexOf('-');
  if (separator < 0) return undefined;
  const end = value.indexOf('-', separator + 1);
  return value.slice(separator + 1, end < 0 ? value.length : end);
}
export const getOppositeAxis = axis => axis === 'x' ? 'y' : 'x';
export const getAxisLength = axis => axis === 'y' ? 'height' : 'width';
export const getSideAxis = placement => placement[0] === 't' || placement[0] === 'b' ? 'y' : 'x';
export const getAlignmentAxis = placement => getOppositeAxis(getSideAxis(placement));
const opposites = new Map([['top', 'bottom'], ['bottom', 'top'], ['left', 'right'], ['right', 'left']]);
export function getOppositePlacement(placement) {
  const side = getSide(placement);
  return opposites.get(side) + placement.slice(side.length);
}
export function getOppositeAlignmentPlacement(placement) {
  return placement.includes('start') ? placement.replace('start', 'end') : placement.replace('end', 'start');
}
export function getAlignmentSides(placement, rects, rtl = false) {
  const horizontal = getAlignmentAxis(placement) === 'x';
  const aligned = getAlignment(placement);
  let positive = horizontal ? aligned === (rtl ? 'end' : 'start') : aligned === 'start';
  const length = horizontal ? 'width' : 'height';
  if (rects.reference[length] > rects.floating[length]) positive = !positive;
  return horizontal ? (positive ? ['right', 'left'] : ['left', 'right']) : (positive ? ['bottom', 'top'] : ['top', 'bottom']);
}
export function getExpandedPlacements(placement) {
  const opposite = getOppositePlacement(placement);
  return [getOppositeAlignmentPlacement(placement), opposite, getOppositeAlignmentPlacement(opposite)];
}
export function getOppositeAxisPlacements(placement, flipAlignment, direction, rtl) {
  const side = getSide(placement), alignment = getAlignment(placement);
  let result;
  if (side === 'top' || side === 'bottom') result = (direction === 'start') !== !!rtl ? ['left', 'right'] : ['right', 'left'];
  else if (side === 'left' || side === 'right') result = direction === 'start' ? ['top', 'bottom'] : ['bottom', 'top'];
  else return [];
  if (alignment) {
    result[0] += '-' + alignment;
    result[1] += '-' + alignment;
    if (flipAlignment) result.push(getOppositeAlignmentPlacement(result[0]), getOppositeAlignmentPlacement(result[1]));
  }
  // Each call owns its array, including unaligned placements.
  return result;
}
export function expandPaddingObject(value) {
  return {top: value.top ?? 0, right: value.right ?? 0, bottom: value.bottom ?? 0, left: value.left ?? 0};
}
export function getPaddingObject(value) {
  return typeof value === 'number' ? {top: value, right: value, bottom: value, left: value} : expandPaddingObject(value);
}
export function rectToClientRect({x, y, width, height}) {
  return {width, height, top: y, left: x, right: x + width, bottom: y + height, x, y};
}
