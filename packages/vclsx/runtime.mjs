// An output accumulator keeps ordinary calls allocation-light. Deep arrays use
// explicit frames, with active-path cycle detection rather than a global cache.
function deep(output, array) {
  const active = new Set([array]);
  const frames = [{array, index: 0}];
  while (frames.length) {
    const frame = frames[frames.length - 1];
    if (frame.index >= frame.array.length) {
      active.delete(frame.array); frames.pop(); continue;
    }
    const value = frame.array[frame.index++];
    if (Array.isArray(value)) {
      if (active.has(value)) throw new TypeError('Class-name arrays must not contain cycles.');
      active.add(value); frames.push({array: value, index: 0});
    } else output = append(output, value, 0);
  }
  return output;
}
function append(output, value, depth) {
  if (!value) return output;
  switch (typeof value) {
    case 'string':
    case 'number': return output ? output + ' ' + value : '' + value;
    case 'object':
      if (Array.isArray(value)) {
        if (depth === 32) return deep(output, value);
        for (let i = 0; i < value.length; i++) output = append(output, value[i], depth + 1);
      } else {
        for (const key in value) if (Object.hasOwn(value, key) && value[key]) output = output ? output + ' ' + key : key;
      }
  }
  return output;
}
export function clsx() {
  let output = '';
  for (let i = 0; i < arguments.length; i++) {
    const value = arguments[i];
    if (typeof value === 'string') {if (value) output = output ? output + ' ' + value : value;}
    else output = append(output, value, 0);
  }
  return output;
}
export default clsx;
