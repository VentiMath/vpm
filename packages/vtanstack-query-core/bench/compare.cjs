'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
(async () => {
  const {upstream, vpm} = await require('../../../scripts/bench-library.cjs').load({upstream: () => import('../../../scripts/tanstack-query-conformance/node_modules/@tanstack/query-core/build/modern/index.js'), vpm: () => import('../query-client.js')});
  const options = {defaultOptions: {queries: {gcTime: Infinity}, mutations: {gcTime: Infinity}}};
  const cases = [
    {name: 'client construction', make: ({QueryClient}) => () => new QueryClient(options), validate: client => assert.equal(client.getQueryCache().getAll().length, 0)},
    {name: 'cached query read', make: ({QueryClient}) => {const client = new QueryClient(options); client.setQueryData(['records', {campus: 3}], {count: 12}); return () => client.getQueryData(['records', {campus: 3}]);}, validate: value => assert.deepEqual(value, {count: 12})},
    {name: 'unchanged JSON update, 16 records', make: ({QueryClient}) => {const client = new QueryClient(options); const data = () => ({records: Array.from({length: 16}, (_, id) => ({id, label: 'record'}))}); client.setQueryData(['records'], data()); return () => client.setQueryData(['records'], data());}, validate: value => assert.equal(value.records.length, 16)},
    {name: 'fresh fetchQuery cache hit', async: true, make: ({QueryClient}) => {const client = new QueryClient(options); client.setQueryData(['record'], 42); return () => client.fetchQuery({queryKey: ['record'], staleTime: Infinity, queryFn: async () => {throw Error('unexpected fetch');}});}, validate: value => assert.equal(value, 42)},
    {name: 'deduplicated concurrent requests', async: true, make: ({QueryClient}) => {const client = new QueryClient(options); const query = {queryKey: ['record'], queryFn: async () => 42}; return async () => {const a = client.fetchQuery(query), b = client.fetchQuery(query); return Promise.all([a, b]);};}, validate: value => assert.deepEqual(value, [42, 42])},
    {name: 'active invalidation and refresh', async: true, make: ({QueryClient, QueryObserver}) => {const client = new QueryClient(options); client.setQueryData(['record'], 42); const observer = new QueryObserver(client, {queryKey: ['record'], staleTime: Infinity, queryFn: async () => 42}); observer.subscribe(() => {}); return async () => {await client.invalidateQueries({queryKey: ['record']}); return observer.getCurrentResult().data;};}, validate: value => assert.equal(value, 42)},
    {name: 'mutation and completed-entry cleanup', async: true, make: ({QueryClient, MutationObserver}) => {const client = new QueryClient(options), observer = new MutationObserver(client, {mutationFn: async value => value + 1}); return async () => {const value = await observer.mutate(41); observer.reset(); client.getMutationCache().clear(); return value;};}, validate: value => assert.equal(value, 42)},
  ];
  await require('../../../scripts/bench-process.cjs').run({root: path.resolve(__dirname, '..'), upstream, vpm, cases, files: ['../../scripts/bench-library.cjs', 
    'query-client.js','runtime.js','cache.js','observer.js','mutation.js','package.json','bench/compare.cjs',
    '../../scripts/tanstack-query-conformance/package-lock.json', '../../scripts/tanstack-query-conformance/node_modules/@tanstack/query-core/build/modern',
  ]});
})().catch(error => {console.error(error); process.exitCode = 1;});
