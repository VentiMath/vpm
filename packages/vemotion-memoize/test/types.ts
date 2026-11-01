import memoize from 'vemotion-memoize';
const length = memoize((value: string) => value.length);
const result: number = length('abc');
// @ts-expect-error arguments are strings
length(1);
void result;
