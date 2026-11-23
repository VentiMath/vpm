import expand = require('../index.cjs');
const results: string[] = expand('{a,b}', {max: 2});
const options: expand.BraceExpansionOptions = {maxSteps: 100, maxLength: 100};
expand.expand('a{1..2}', options);
// @ts-expect-error Numeric pattern is not supported.
expand(1);
void results;
