import bytes, { parse, format } from 'vbytes';
const count: number = bytes('1kb');
const parsed: number = parse(1024);
const absent: null = parse(undefined);
const maybe: number | null = parse(Math.random() ? '1kb' : null);
const result: string | null = format(count, { unit: 'kB', decimalPlaces: 3 });
const same: string | null = bytes(1024, { thousandsSeparator: ',', fixedDecimals: true });
const options: bytes.Options = { decimalPlaces: null, unitSeparator: ' ' };
format(10, options);
// @ts-expect-error values must be strings or numbers
parse({});
// @ts-expect-error options are typed
format(1, { fixedDecimals: 1 });
// @ts-expect-error parsed string sizes are numbers
const wrong: string = parse('1kb');
void [parsed, absent, maybe, result, same, wrong];
