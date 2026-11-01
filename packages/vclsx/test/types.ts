import clsx = require('vclsx');
import lite from 'vclsx/lite';
const classes: clsx.ClassValue = ['one', {two: true}, ['three', false]] as const;
const result: string = clsx(classes, 1, null);
const slim: string = lite('one', false, 'two');
// @ts-expect-error symbols are not class-name inputs
clsx(Symbol('no'));
void [result, slim];
