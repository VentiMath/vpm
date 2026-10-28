import vary, { append } from 'vvary';
import type { ServerResponse } from 'node:http';
declare const res: ServerResponse;
const result: string = append('Accept', Object.freeze(['Origin', 'Cookie']));
vary(res, 'Origin');
vary(res, ['Accept']);
vary({ getHeader: () => undefined, setHeader(_name, value) { const v: string = value; void v; } }, 'Accept');
// @ts-expect-error missing header methods
vary({}, 'Origin');
// @ts-expect-error fields must be strings
append('', [1]);
// @ts-expect-error header must be a string
append(1, 'Origin');
void result;
