import {requestJson, identity, JsonRequestError} from 'vfullcalendar-core/protected-api';
import type {BaseOptions, EventSourceOptions, FetchResponse, Identity, RawOptionsFromRefiners, RefinedOptionsFromRefiners} from 'vfullcalendar-core/protected-api';
type Refiners = {title: (input: unknown, name: string) => string; editable: typeof Boolean};
const raw: RawOptionsFromRefiners<Refiners> = {title: 'x', editable: true};
const refined: RefinedOptionsFromRefiners<Refiners> = {editable: false};
const same: Identity<number> = identity;
const options: BaseOptions & EventSourceOptions = {};
async function load(): Promise<number> {
  try {
    const [events, response]: [string[], FetchResponse] = await requestJson<string[]>('GET', '/feed', {start: '2026-11-01'});
    return response.ok ? events.length : 0;
  } catch (error) {
    return error instanceof JsonRequestError ? error.response.status : -1;
  }
}
// Native fetch's Response, since the workspace's tests compile with Node types.
const response: Response = new JsonRequestError('x', new Response('[]')).response;
// @ts-expect-error parameters are a record
requestJson('GET', '/feed', 'start=1');
void [raw, refined, same(1), options, load, response];
