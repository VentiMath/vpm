import {logger, setGlobalOptions} from 'vfirebase-functions/v2';
import {onRequest, onCall, HttpsError, type Request, type CallableRequest} from 'vfirebase-functions/v2/https';
import {onSchedule} from 'vfirebase-functions/v2/scheduler';
import {onDocumentCreated, onDocumentWritten} from 'vfirebase-functions/v2/firestore';
import {onTaskDispatched} from 'vfirebase-functions/v2/tasks';
import {defineSecret} from 'vfirebase-functions/params';

setGlobalOptions({region: 'us-central1', maxInstances: 10});
const apiKey = defineSecret('API_KEY');
export const api = onRequest({cors: true, secrets: [apiKey]}, (request: Request, response) => {
  const raw: Buffer = request.rawBody;
  const method: string = request.method, url: string = request.url;
  const headers: Record<string, string | string[] | undefined> = request.headers;
  const authorization: string | undefined = request.headers.authorization;
  const parameter: string = request.params.id;
  void [method, url, headers, authorization, parameter];
  logger.info('request', {path: request.path, bytes: raw.length, key: apiKey.value().length});
  response.status(200).json({ok: true});
});
export const grade = onCall<{answer: string}, Promise<{correct: boolean}>>(async (request: CallableRequest<{answer: string}>, response) => {
  const aborted: boolean | undefined = response?.signal.aborted;
  void aborted;
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  return {correct: request.data.answer === '42'};
});
export const nightly = onSchedule('every day 03:00', async event => { logger.log('ran at', event.scheduleTime); });
export const created = onDocumentCreated('rooms/{roomId}', event => { const name: unknown = event.data?.get('name'); logger.debug(event.params.roomId, name); });
export const written = onDocumentWritten('users/{uid}', event => { void event.data?.after.exists; });
export const task = onTaskDispatched<{id: string}>({retryConfig: {maxAttempts: 3}}, async request => { logger.warn(request.data.id); });
// @ts-expect-error onRequest handlers receive a request first
onRequest((response: number) => response);
