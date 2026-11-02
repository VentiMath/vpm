import { shallowEqual, shallowEqualArrays, shallowEqualObjects } from 'vshallow-equal';
import arrays from 'vshallow-equal/arrays';
import objects from 'vshallow-equal/objects';
const values = [1, 2] as const;
const results: boolean[] = [shallowEqual({}, {}), shallowEqualArrays(values, values),
  shallowEqualObjects(null, undefined), arrays(values, values), objects({}, {})];
void results;
// @ts-expect-error arrays are required
arrays(1, 2);
// @ts-expect-error object comparisons require objects
objects('a', 'b');
