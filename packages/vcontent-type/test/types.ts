import * as contentType from 'vcontent-type';
import defaultImport from 'vcontent-type';
import { parse, format, type ContentType, type ParseOptions } from 'vcontent-type';

const options: ParseOptions = { comma: true, start: 0, parameters: true };
const parsed: ContentType = parse('text/html; charset=utf-8', options);
parsed.parameters.charset = 'utf-16le';
const index: number = parsed.index;
const header: string = format(parsed);
contentType.parse(header, null);
defaultImport.format({ type: 'text/plain', parameters: null });
format({ type: 'application/json', parameters: { charset: 'utf-8' } } as const);
// @ts-expect-error callers must supply a type
format({});
// @ts-expect-error parameter values must be strings
format({ type: 'text/plain', parameters: { version: 2 } });
// @ts-expect-error request objects are not accepted
parse({ headers: { 'content-type': 'text/plain' } });
// @ts-expect-error parse flags are booleans
parse(header, { comma: 1 });
void index;
