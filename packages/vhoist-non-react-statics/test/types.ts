import hoist = require('vhoist-non-react-statics');

const source = Object.assign(() => null, {
  answer: 42, hidden: 'private', displayName: 'Source',
});
const result = hoist({ own: true }, source, { hidden: true } as const);
const answer: number = result.answer;
const own: boolean = result.own;
// @ts-expect-error React-owned statics are excluded
result.displayName;
// @ts-expect-error Blacklisted statics are excluded
result.hidden;
const intrinsic: { own: boolean } = hoist({ own: true }, 'div');
void [answer, own, intrinsic];
