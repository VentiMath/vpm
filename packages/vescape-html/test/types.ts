import escapeHtml = require('..');
import escapeHtmlDefault from '..';

const text: string = escapeHtml('<p>');
const missing: string = escapeHtml();
const value: unknown = { toString: () => 'a & b' };
const converted: string = escapeHtml(value);
const imported: string = escapeHtmlDefault('"quoted"');
void [text, missing, converted, imported];

// @ts-expect-error The result is always a string.
const numeric: number = escapeHtml(42);
// @ts-expect-error The API takes one input and no options.
escapeHtml('text', { preserveEntities: true });
void numeric;
