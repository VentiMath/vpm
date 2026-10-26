import media from 'vmedia-typer';
import { parse, format, test, type MediaType, type FormatInput } from 'vmedia-typer';
const parsed: MediaType = parse('application/problem+json');
parsed.subtype = 'vnd.example';
const input: FormatInput = { type: 'text', subtype: 'plain', suffix: null } as const;
const value: string = format(input);
const valid: boolean = test(media.format(parsed));
// @ts-expect-error no automatic coercion
test(1);
// @ts-expect-error both name components are required
format({ type: 'text' });
// @ts-expect-error suffix is a string, null or omitted
format({ type: 'text', subtype: 'plain', suffix: 1 });
void [value, valid];
