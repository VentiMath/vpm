import parse = require('vrange-parser');
import defaultImport from 'vrange-parser';
const result = parse(100, 'bytes=0-10', { combine: true });
if (typeof result !== 'number') { const unit: string = result.type; const start: number = result[0].start; void [unit, start]; }
defaultImport(0, 'bytes=0-1', null);
// @ts-expect-error bigint representation sizes are unsupported
parse(100n, 'bytes=0-10');
const unsatisfiable: parse.ResultUnsatisfiable = -1;
const invalid: parse.ResultInvalid = -2;
const errorCode: parse.Result = unsatisfiable;
void [invalid, errorCode];
