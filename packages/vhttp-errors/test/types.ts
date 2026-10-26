import createError = require('vhttp-errors');
import defaultImport from 'vhttp-errors';
const error: createError.HttpError = createError(404, 'missing', { detail: 'widget' });
const named: createError.HttpError = new createError.NotFound('missing');
const called: createError.HttpError = createError.ImATeapot();
const numeric: createError.HttpError = new createError[429]();
const prototype: createError.HttpError = createError.NotFound.prototype;
const basePrototype: createError.HttpError = createError.HttpError.prototype;
defaultImport(new Error('original'), { expose: false });
class MissingWidget extends createError.NotFound { widget = 'widget'; }
const sub: MissingWidget = new MissingWidget('missing');
declare const value: unknown;
if (createError.isHttpError(value)) { const status: number = value.status; void status; }
void [error, named, called, numeric, sub, prototype, basePrototype];
// @ts-expect-error base constructor is abstract
new createError.HttpError();
// @ts-expect-error unsupported primitive argument
createError(true);
// @ts-expect-error numeric status must come first
createError('message', 404);
