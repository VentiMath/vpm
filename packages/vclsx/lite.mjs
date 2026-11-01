export function clsx() {
  let output = '';
  for (let i = 0; i < arguments.length; i++) {
    const value = arguments[i];
    if (typeof value === 'string' && value) output = output ? output + ' ' + value : value;
  }
  return output;
}
export default clsx;
