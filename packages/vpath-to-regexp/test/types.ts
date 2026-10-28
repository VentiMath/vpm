import pathRegexp, { TokenData, PathError, parse, match, compile, stringify, pathToRegexp, type ParamData, type PathInput, type Token, type MatchFunction } from 'vpath-to-regexp';
const tokens: readonly Token[] = [{ type: 'text', value: '/' }, { type: 'param', name: 'id' }] as const;
const data = new TokenData(tokens, '/:id');
const paths: PathInput = [data, ['/other/:id']] as const;
const matcher: MatchFunction<ParamData> = match(paths);
const result = matcher('/123');
if (result) {
  const value: string | readonly string[] | undefined = result.params.id;
  const path: string = result.path;
  void [value, path];
}
const custom = match<{ id: string }>('/:id');
const customResult = custom('/123');
if (customResult) { const id: string = customResult.params.id; void id; }
const toPath = compile<{ id: string }>('/:id');
const output: string = toPath({ id: '123' });
const wildcard = compile('/*parts')({ parts: ['a', 'b'] as const });
const regular: RegExp = pathToRegexp(paths).regexp;
const text: string = stringify(parse('/{*path}'));
const problem: TypeError = new PathError('problem', undefined);
const same: typeof parse = pathRegexp.parse;
// @ts-expect-error decode must be a function or false
match('/:x', { decode: true });
// @ts-expect-error delimiters are strings
pathToRegexp('/a', { delimiter: 1 });
// @ts-expect-error path input must be a string
matcher(123);
// @ts-expect-error required id is a string
toPath({ id: 123 });
// @ts-expect-error parameter arrays contain strings
compile('/*x')({ x: [1] });
void [output, wildcard, regular, text, problem, same];
