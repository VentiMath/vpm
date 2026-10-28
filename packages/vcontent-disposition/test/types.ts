import disposition, { create, parse, format, encodeExtended, decodeExtended, type ContentDisposition, type CreateOptions, type ParseOptions, type FormatOptions } from 'vcontent-disposition';
const options: CreateOptions = { type: 'inline', fallback: false };
const parsing: ParseOptions = { multipart: true, extended: false };
const formatting: FormatOptions = parsing;
const header: string = create('雪.txt', options);
const result: ContentDisposition = parse(header, parsing);
const encoded: string = encodeExtended(result.parameters.filename);
const decoded: string | undefined = decodeExtended(encoded);
format(result, formatting); disposition.create(); create(undefined, null);
format({ type: 'attachment', parameters: null });
// @ts-expect-error format requires a type
format({ parameters: {} });
// @ts-expect-error string inputs cannot be implicitly coerced
create(1);
// @ts-expect-error parameter values must be strings
format({ type: 'attachment', parameters: { x: 1 } });
// @ts-expect-error option is boolean
parse(header, { extended: 'false' });
// @ts-expect-error decoding can fail
const required: string = decoded;
void [required];
