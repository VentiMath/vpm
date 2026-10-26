import status = require('..');
import statusDefault from '..';
const message: string = status(200);
const result: string | number = statusDefault('Not Found');
const maybeMessage: string | undefined = status.message[999];
const maybeCode: number | undefined = status.code['missing'];
const maybeFlag: true | undefined = status.empty[200];
void [message, result, maybeMessage, maybeCode, maybeFlag];
// @ts-expect-error Tables cannot be modified.
status.message[200] = 'changed';
// @ts-expect-error The list cannot be modified.
status.codes.push(999);
// @ts-expect-error Table references cannot be replaced.
status.message = {};
// @ts-expect-error No object coercion.
status({ code: 200 });
