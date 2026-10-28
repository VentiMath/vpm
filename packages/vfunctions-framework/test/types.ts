import { http, cloudEvent, type CloudEvent, type HttpFunction, type CloudEventFunctionWithCallback } from 'vfunctions-framework';
import { getFunction, getTestServer } from 'vfunctions-framework/testing';
const handler: HttpFunction = (req, res) => {
  const id: string | undefined = req.executionId;
  const raw: string | undefined = req.rawBody?.toString('utf8');
  req.abortController?.signal.addEventListener('abort', () => {});
  res.json({ id, raw });
};
http('hello', handler);
cloudEvent<{ name: string }>('event', event => { const name: string | undefined = event.data?.name; void name; });
const callback: CloudEventFunctionWithCallback<number> = (event, done) => done(null, event.data);
cloudEvent('callback', callback);
const event: CloudEvent<number> = { id: '1', source: '/test', type: 'test', specversion: '1.0', data: 42 };
void event;
getFunction('hello');
getTestServer('hello').listen(0, '127.0.0.1', () => {}).close();
// @ts-expect-error handler must be callable
http('invalid', 1);
// @ts-expect-error event envelope requires an id
const invalid: CloudEvent = { source: '/', type: 'x', specversion: '1.0' };
void invalid;
