import { EventEmitter } from 'node:events';
import first = require('..');

const emitter = new EventEmitter();
const sources = [[emitter, 'finish', Symbol('close')]] as const;
const handle = first(sources, (error, source, event, args) => {
  const payload: unknown = error;
  const original: first.Emitter = source;
  const name: string | symbol = event;
  const values: unknown[] = args;
  void [payload, original, name, values];
  // @ts-expect-error Payload types require consumer narrowing.
  const message: string = error.message;
  void message;
});
handle.cancel();
handle(() => {});
first([[emitter, 'error']]);
first([]);

// @ts-expect-error Each source needs at least one event name.
first([[emitter]]);
// @ts-expect-error Event names are strings or symbols.
first([[emitter, 42]]);
// @ts-expect-error Emitters need on() and removeListener().
first([[{}, 'finish']]);
// @ts-expect-error Callbacks must be functions.
first([[emitter, 'finish']], 'callback');
// @ts-expect-error Replacement callbacks must be functions.
handle(null);
