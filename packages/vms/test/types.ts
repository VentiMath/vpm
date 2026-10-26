import ms = require('..');
import msDefault from '..';
const parsed: number | undefined = ms('2h');
const formatted: string = msDefault(1500, { long: true });
const mixedInput: string | number = Math.random() ? '1s' : 1000;
const mixed: string | number | undefined = ms(mixedInput);
void [parsed, formatted, mixed];
// @ts-expect-error Parse can fail.
const definite: number = ms('invalid');
// @ts-expect-error Unsupported input type.
ms(true);
// @ts-expect-error The option must be boolean.
ms(1, { long: 'yes' });
void definite;
