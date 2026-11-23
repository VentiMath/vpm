import mm = require('../index.cjs');
const options: mm.MinimatchOptions = {dot:true,normalize:'NFC',platform:'linux'};
const matcher = new mm.Minimatch('src/**/*.ts', options);
const result: boolean = matcher.match('src/a.ts');
const paths: string[] = mm.match(['a.ts'], '*.ts');
const defaults = mm.defaults({dot:true}).defaults({nocase:true});
const match: boolean = defaults('a.ts', '*.TS');
const parts: mm.ParseReturnFiltered[][] = matcher.set;
// @ts-expect-error A glob must be a string.
mm('x', 1);
// @ts-expect-error Unknown Unicode normalization form.
mm('x', 'x', {normalize:'invalid'});
