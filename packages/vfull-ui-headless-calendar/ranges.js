const lower = range => range.start == null ? -Infinity : +range.start;
const upper = range => range.end == null ? Infinity : +range.end;
export function parseRange(input, env) {
  const start = input.start == null ? null : env.createMarker(input.start);
  const end = input.end == null ? null : env.createMarker(input.end);
  return (!start && !end) || (start && end && end < start) ? null : {start, end};
}
export const rangesEqual = (a, b) => lower(a) === lower(b) && upper(a) === upper(b);
export const rangesIntersect = (a, b) => upper(a) > lower(b) && upper(b) > lower(a);
export const rangeContainsRange = (outer, inner) => lower(outer) <= lower(inner) && upper(outer) >= upper(inner);
export const rangeContainsMarker = (range, value) => +value >= lower(range) && +value < upper(range);
export function intersectRanges(a, b) {
  const start = Math.max(lower(a), lower(b)), end = Math.min(upper(a), upper(b));
  return start < end ? {start: start === -Infinity ? null : new Date(start), end: end === Infinity ? null : new Date(end)} : null;
}
export function constrainMarkerToRange(date, range) {
  return range.start != null && date < range.start ? range.start : range.end != null && date >= range.end ? new Date(+range.end - 1) : date;
}
export function invertRanges(ranges, constraint) {
  const stop = +constraint.end, result = [];
  let cursor = +constraint.start;
  // Clip before unioning so an event outside the visible range cannot emit a
  // gap beyond it. Sorting a copy keeps caller-owned event order intact.
  const spans = ranges.map(range => [Math.max(cursor, lower(range)), Math.min(stop, upper(range))]).filter(([a, b]) => a < b).sort((a, b) => a[0] - b[0]);
  for (const [start, end] of spans) {
    if (start > cursor) result.push({start: new Date(cursor), end: new Date(start)});
    cursor = Math.max(cursor, end);
  }
  if (cursor < stop) result.push({start: new Date(cursor), end: new Date(stop)});
  return result;
}
