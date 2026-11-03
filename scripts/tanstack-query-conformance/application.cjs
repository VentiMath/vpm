'use strict';
// The same application-facing checks run against the pinned original and VPM.
// They deliberately do not import private upstream modules.
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', {url: 'https://query.test/'});
for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'MutationObserver']) Object.defineProperty(globalThis, name, {value: dom.window[name], configurable: true, writable: true});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const testing = require('@testing-library/react');
const {renderHook, act, waitFor, cleanup} = testing;
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => {resolve = yes; reject = no;}); return {promise, resolve, reject}; };
const delay = () => new Promise(resolve => setTimeout(resolve, 0));

(async () => {
  const upstream = process.argv.includes('--upstream'), current = process.argv.includes('--current');
  const consumer = process.env.VPM_QUERY_CONSUMER && require('node:module').createRequire(require('node:path').join(process.env.VPM_QUERY_CONSUMER, 'package.json'));
  const core = consumer ? consumer('vtanstack-query-core') : current ? require('current-query-core') : upstream ? require('@tanstack/query-core') : await import('../../packages/vtanstack-query-core/query-client.js');
  const hooks = consumer ? consumer('vtanstack-react-query') : current ? require('current-react-query') : upstream ? require('@tanstack/react-query') : (await import('../../packages/vtanstack-react-query/bindings.js')).createBindings(React, core);
  const clients = [];
  function setup() {
    const client = new core.QueryClient({defaultOptions: {queries: {retry: false, gcTime: Infinity}, mutations: {gcTime: Infinity}}}); clients.push(client);
    const wrapper = ({children}) => React.createElement(hooks.QueryClientProvider, {client}, children);
    return {client, wrapper};
  }
  try {
    // Two mounted consumers, one request, and one shared data object.
    {
      const {client, wrapper} = setup(), gate = deferred(); let calls = 0;
      const options = {queryKey: ['records'], queryFn: () => {calls++; return gate.promise;}, staleTime: Infinity};
      const rendered = renderHook(() => [hooks.useQuery(options), hooks.useQuery(options)], {wrapper});
      assert.equal(rendered.result.current[0].isLoading, true);
      const data = [{id: 1}]; await act(async () => {gate.resolve(data); await gate.promise;});
      await waitFor(() => assert.equal(rendered.result.current[1].isSuccess, true));
      assert.equal(calls, 1); assert.equal(rendered.result.current[0].data, rendered.result.current[1].data);
      assert.deepEqual(client.getQueryData(['records']), data); rendered.unmount();
    }
    // Changing a dependent key and enabled state cannot display another key's data.
    {
      const {wrapper} = setup(); let calls = 0;
      const rendered = renderHook(({id, enabled}) => hooks.useQuery({queryKey: ['record', id], enabled, queryFn: async () => {calls++; return id;}}), {wrapper, initialProps: {id: 1, enabled: false}});
      await act(delay); assert.equal(calls, 0); assert.equal(rendered.result.current.isLoading, false);
      rendered.rerender({id: 1, enabled: true}); await waitFor(() => assert.equal(rendered.result.current.data, 1));
      rendered.rerender({id: 2, enabled: true}); await waitFor(() => assert.equal(rendered.result.current.data, 2));
      assert.equal(calls, 2); rendered.unmount();
    }
    // An awaited invalidation keeps a mutation pending until refreshed data arrives.
    {
      const {client, wrapper} = setup(), refresh = deferred(); client.setQueryData(['record'], 'old');
      const rendered = renderHook(() => ({
        query: hooks.useQuery({queryKey: ['record'], staleTime: Infinity, queryFn: () => refresh.promise}),
        mutation: hooks.useMutation({mutationFn: async () => 'saved', onSuccess: () => client.invalidateQueries({queryKey: ['record']})}),
      }), {wrapper});
      let promise; await act(async () => {promise = rendered.result.current.mutation.mutateAsync(); await delay();});
      assert.equal(rendered.result.current.mutation.isPending, true);
      await act(async () => {refresh.resolve('new'); await promise;});
      await waitFor(() => assert.equal(rendered.result.current.mutation.isSuccess, true));
      assert.equal(rendered.result.current.query.data, 'new'); rendered.unmount();
    }
    // Optimistic updates roll back through onMutate's returned context.
    {
      const {client, wrapper} = setup(), server = deferred(); client.setQueryData(['record'], 'original');
      const rendered = renderHook(() => ({
        query: hooks.useQuery({queryKey: ['record'], staleTime: Infinity, queryFn: async () => 'original'}),
        mutation: hooks.useMutation({mutationFn: () => server.promise,
          onMutate: value => { const old = client.getQueryData(['record']); client.setQueryData(['record'], value); return old; },
          onError: (error, variables, old) => client.setQueryData(['record'], old),
        }),
      }), {wrapper});
      let promise; await act(async () => {promise = rendered.result.current.mutation.mutateAsync('optimistic'); promise.catch(() => {}); await delay();});
      await waitFor(() => assert.equal(rendered.result.current.query.data, 'optimistic'));
      await act(async () => {server.reject(new Error('reject')); await promise.catch(() => {});});
      await waitFor(() => assert.equal(rendered.result.current.query.data, 'original'));
      assert.equal(rendered.result.current.mutation.isError, true); rendered.unmount();
    }
    // Cancellation on unmount reaches a consumed native AbortSignal, and stale
    // completion from a transport that ignored it cannot write into the cache.
    {
      const {client, wrapper} = setup(), gate = deferred(); let signal;
      const rendered = renderHook(() => hooks.useQuery({queryKey: ['abort'], queryFn: context => {signal = context.signal; return gate.promise;}}), {wrapper});
      await act(delay); rendered.unmount(); assert.equal(signal.aborted, true);
      gate.resolve('late'); await delay(); assert.equal(client.getQueryData(['abort']), undefined);
    }
    // Provider changes isolate caches even when keys are the same.
    {
      const first = setup(), second = setup(); first.client.setQueryData(['shared'], 'first'); second.client.setQueryData(['shared'], 'second');
      const a = renderHook(() => hooks.useQuery({queryKey: ['shared'], enabled: false, queryFn: async () => 'unused'}), {wrapper: first.wrapper});
      const b = renderHook(() => hooks.useQuery({queryKey: ['shared'], enabled: false, queryFn: async () => 'unused'}), {wrapper: second.wrapper});
      assert.equal(a.result.current.data, 'first'); assert.equal(b.result.current.data, 'second'); a.unmount(); b.unmount();
    }
    // The browser's first hidden-to-visible event refetches stale mounted data.
    {
      Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'hidden'});
      const {wrapper} = setup(); let calls = 0;
      const rendered = renderHook(() => hooks.useQuery({queryKey: ['focus-event'], queryFn: async () => ++calls}), {wrapper});
      await waitFor(() => assert.equal(rendered.result.current.data, 1));
      await act(async () => {
        Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'});
        window.dispatchEvent(new window.Event('visibilitychange')); await delay();
      });
      await waitFor(() => assert.equal(rendered.result.current.data, 2)); rendered.unmount();
    }
    await require('./transitions.cjs')(React, {...core, ...hooks}, testing);
    console.log(`${current ? 'Current upstream 5.105.3' : upstream ? 'Upstream 5.105.0' : 'VPM'}: application scenarios passed, including scheduled query/mutation notifications and three async transition retries.`);
  } finally {cleanup(); clients.forEach(client => client.clear()); dom.window.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
