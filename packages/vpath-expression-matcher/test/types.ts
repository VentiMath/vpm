import api, { Expression, ExpressionSet, Matcher, MatcherView, type MatcherSnapshot } from 'vpath-expression-matcher';
const expression=new Expression('..item[id]:first',{}, {action:'keep'});
const set=new ExpressionSet<{action:string}>().add(expression).seal();
const matcher=new Matcher({separator:'.'});matcher.push('item',{id:42},null,{keep:['id']});
const view:MatcherView=matcher.readOnly();
const snapshot:MatcherSnapshot=view.snapshot();
snapshot.siblingStacks[0]?.counts.set('item',1);matcher.restore(snapshot);
const hit:Expression<{action:string}>|null=set.findMatch(view);
const attribute:unknown=view.getAttrValue('id');
expression.data={action:'skip'};void hit;void attribute;void new api.Matcher();
// @ts-expect-error view cannot push
view.push('x');
// @ts-expect-error compiled segments are readonly
expression.segments[0]!.tag='changed';
// @ts-expect-error absent match is nullable
const missing:Expression=set.findMatch(matcher);
// @ts-expect-error attributes must be objects
matcher.push('x',1);
