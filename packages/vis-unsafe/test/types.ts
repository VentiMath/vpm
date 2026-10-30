import isUnsafe,{HTML,XML,whyUnsafe,allUnsafe,type PatternList,type MatchResult} from 'vis-unsafe';
const rules:PatternList=[{id:'custom',description:'custom',pattern:/x/g}];
const flagged:boolean=isUnsafe('a',[HTML,XML,rules]);
const first:MatchResult|null=whyUnsafe('x',rules);
const matches:MatchResult[]=allUnsafe('x',rules);void flagged;void first;void matches;
// @ts-expect-error contexts are readonly
HTML.push({id:'x',description:'x',pattern:/x/});
// @ts-expect-error strings required
isUnsafe(1,XML);
