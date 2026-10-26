import { EventEmitter } from 'node:events';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import onFinished = require('..');

const request = new IncomingMessage(new Socket());
const response = new ServerResponse(request);

const sameRequest: IncomingMessage = onFinished(request, (error, original) => {
  const incoming: IncomingMessage = original;
  const payload: unknown = error;
  void [incoming, payload];
  // @ts-expect-error Socket error payloads need narrowing.
  const message: string = error.message;
  void message;
});
const sameResponse: ServerResponse = onFinished(response, (_error, original) => {
  original.setHeader('X-Type-Test', 'response');
});
const finished: boolean | undefined = onFinished.isFinished(response);
const unknown: boolean | undefined = onFinished.isFinished({});
const structural = Object.assign(new EventEmitter(), { finished: false, socket: null, marker: 'custom' });
onFinished(structural, (_error, original) => { const marker: string = original.marker; void marker; });
void [sameRequest, sameResponse, finished, unknown];

// @ts-expect-error A callback is required.
onFinished(response);
// @ts-expect-error Callbacks must be functions.
onFinished(response, 'callback');
// @ts-expect-error Pending messages must provide EventEmitter methods.
onFinished({ finished: false }, () => {});
