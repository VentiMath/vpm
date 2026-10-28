import parse, { type Options, type ParsedArgs } from 'vminimist';
const options: Options = { string: ['port'] as const, boolean: true, alias: { port: ['p'] as const }, default: { port: '8080' }, unknown: arg => typeof arg === 'string' };
const result: ParsedArgs = parse(['--port', '8080'] as const, options);
const positionals: (string | number)[] = result._;
const value: unknown = result.port;
if (typeof value === 'string') value.toUpperCase();
parse('', null);
// @ts-expect-error arguments must be strings or numbers
parse([{}]);
// @ts-expect-error flags must be booleans
parse([], { stopEarly: 'yes' });
// @ts-expect-error aliases must contain names
parse([], { alias: { x: 42 } });
// @ts-expect-error dynamic values must be narrowed
const port: string = result.port;
void positionals; void port;
