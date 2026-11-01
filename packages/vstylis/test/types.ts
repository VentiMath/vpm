import {compile, middleware, prefixer, rulesheet, serialize, stringify, prefix, tokenize, RULESET, type Element, type Middleware} from 'vstylis';
const rules: string[] = [];
const elements: Element[] = compile('.a{color:red;&:hover{color:blue;}}');
const layer: Middleware = element => {
  if (element.type === RULESET && !element.root) element.return = '';
};
const css: string = serialize(elements, middleware([layer, prefixer, stringify, rulesheet(rule => rules.push(rule))]));
const prefixed: string = prefix('display:flex;', 7);
const tokens: string[] = tokenize('a:not(.b)');
// @ts-expect-error compile takes CSS text
compile(elements);
void [css, prefixed, tokens];
