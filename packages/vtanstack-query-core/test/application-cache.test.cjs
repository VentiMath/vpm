'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const load = () => import('../query-client.js');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return {promise, resolve, reject}; };

test('parallel consumers share one request and fresh cache data preserves references', async () => {
  const {QueryClient} = await load(), client = new QueryClient(), gate = deferred();
  let calls = 0;
  const options = {queryKey: ['records', {campus: 2, page: 1}], queryFn: () => { calls++; return gate.promise; }, staleTime: 60000};
  const a = client.fetchQuery(options), b = client.fetchQuery({...options, queryKey: ['records', {page: 1, campus: 2}]});
  assert.equal(a, b); await tick(); assert.equal(calls, 1);
  const data = [{id: 1}]; gate.resolve(data);
  assert.equal(await a, data); assert.equal(await client.fetchQuery(options), data); assert.equal(calls, 1);
  client.clear();
});

test('prefix invalidation refreshes active matching queries and preserves unrelated cached data', async () => {
  const {QueryClient, QueryObserver} = await load(), client = new QueryClient();
  let calls = 0;
  const observer = new QueryObserver(client, {queryKey: ['records', 1], queryFn: async () => ++calls, staleTime: Infinity});
  const stop = observer.subscribe(() => {}); await observer.refetch({cancelRefetch: false});
  client.setQueryData(['unrelated'], 'keep');
  await client.invalidateQueries({queryKey: ['records']});
  assert.equal(calls, 2); assert.equal(observer.getCurrentResult().data, 2); assert.equal(client.getQueryData(['unrelated']), 'keep');
  stop(); await client.invalidateQueries({queryKey: ['records']}); assert.equal(calls, 2);
  assert.equal(client.getQueryState(['records', 1]).isInvalidated, true); client.clear();
});

test('disabled dependent queries do not fetch until enabled and manual refetch still works', async () => {
  const {QueryClient, QueryObserver} = await load(), client = new QueryClient(); let calls = 0;
  const options = {queryKey: ['dependent'], queryFn: async () => ++calls, enabled: false};
  const observer = new QueryObserver(client, options), stop = observer.subscribe(() => {});
  await client.invalidateQueries({queryKey: ['dependent']}); assert.equal(calls, 0);
  observer.setOptions({...options, enabled: true}); await observer.refetch({cancelRefetch: false}); assert.equal(calls, 1);
  observer.setOptions(options); await observer.refetch(); assert.equal(calls, 2);
  stop(); client.clear();
});

test('cancelled requests cannot overwrite a newer result even if the transport ignores abort', async () => {
  const {QueryClient, isCancelledError} = await load(), client = new QueryClient(), old = deferred();
  client.setQueryData(['one'], 'cached');
  const promise = client.fetchQuery({queryKey: ['one'], queryFn: () => old.promise}); await tick();
  await client.cancelQueries({queryKey: ['one']}); await assert.rejects(promise, isCancelledError);
  assert.equal(client.getQueryData(['one']), 'cached');
  await client.fetchQuery({queryKey: ['one'], queryFn: async () => 'new'});
  old.resolve('late'); await tick(); assert.equal(client.getQueryData(['one']), 'new'); client.clear();
});

test('unmount aborts consumed signals but permits unconsumed requests to populate the cache', async () => {
  const {QueryClient, QueryObserver} = await load();
  for (const consume of [false, true]) {
    const client = new QueryClient(), gate = deferred(); let signal;
    const observer = new QueryObserver(client, {queryKey: ['request'], queryFn: context => { if (consume) signal = context.signal; return gate.promise; }});
    const stop = observer.subscribe(() => {}); await tick(); stop(); gate.resolve('done'); await tick();
    assert.equal(client.getQueryData(['request']), consume ? undefined : 'done');
    if (consume) assert.equal(signal.aborted, true); client.clear();
  }
});

test('retry policy counts failures and resolves once without exposing a terminal error', async () => {
  const {QueryClient, QueryObserver} = await load(), client = new QueryClient(); let calls = 0;
  const observer = new QueryObserver(client, {queryKey: ['retry'], retry: 2, retryDelay: 1, queryFn: async () => { if (++calls < 3) throw new Error('temporary'); return 'ok'; }});
  const states = [], stop = observer.subscribe(result => states.push([result.status, result.failureCount]));
  await observer.refetch({cancelRefetch: false});
  assert.equal(calls, 3); assert.ok(states.some(([, failures]) => failures === 2));
  assert.ok(!states.some(([status]) => status === 'error')); assert.equal(observer.getCurrentResult().data, 'ok'); stop(); client.clear();
});

test('cache updates share unchanged branches and handle prototype-looking data as own properties', async () => {
  const {QueryClient} = await load(), client = new QueryClient();
  const a = {list: [{id: 1}], other: 1}; client.setQueryData(['data'], a);
  const b = client.setQueryData(['data'], {list: [{id: 1}], other: 2});
  assert.equal(b.list, a.list); assert.notEqual(b, a);
  const data = JSON.parse('{"__proto__":{"polluted":true},"name":"value"}');
  client.setQueryData(['safe'], {}); const safe = client.setQueryData(['safe'], data);
  assert.equal(Object.getPrototypeOf(safe), Object.prototype); assert.equal(Object.hasOwn(safe, '__proto__'), true); assert.equal({}.polluted, undefined); client.clear();
});

test('optimistic mutations await invalidation and can roll back errors with their own context', async () => {
  const {QueryClient, MutationObserver} = await load(), client = new QueryClient(), gate = deferred();
  client.setQueryData(['record'], 'before'); const order = [];
  const observer = new MutationObserver(client, {
    mutationFn: () => gate.promise,
    onMutate: value => { const previous = client.getQueryData(['record']); client.setQueryData(['record'], value); return previous; },
    onError: (error, variables, previous) => { order.push('error'); client.setQueryData(['record'], previous); },
    onSettled: async () => { await tick(); order.push('settled'); },
  });
  const stop = observer.subscribe(() => {}), result = observer.mutate('optimistic'); await tick();
  assert.equal(client.getQueryData(['record']), 'optimistic'); assert.equal(client.isMutating(), 1);
  gate.reject(new Error('server rejected')); await assert.rejects(result, /server rejected/);
  assert.deepEqual(order, ['error', 'settled']); assert.equal(client.getQueryData(['record']), 'before'); assert.equal(client.isMutating(), 0);
  stop(); client.clear();
});

test('concurrent mutations settle independently while the observer follows the latest call', async () => {
  const {QueryClient, MutationObserver} = await load(), client = new QueryClient(), gates = [deferred(), deferred()], completed = [];
  const observer = new MutationObserver(client, {mutationFn: index => gates[index].promise, onSuccess: value => completed.push(value)});
  const stop = observer.subscribe(() => {}), callbacks = [];
  const first = observer.mutate(0, {onSuccess: () => callbacks.push('old')}), second = observer.mutate(1, {onSuccess: () => callbacks.push('new')});
  gates[1].resolve('second'); assert.equal(await second, 'second');
  gates[0].resolve('first'); assert.equal(await first, 'first');
  assert.equal(observer.getCurrentResult().data, 'second'); assert.deepEqual(completed, ['second', 'first']); assert.deepEqual(callbacks, ['new']);
  observer.reset(); assert.equal(observer.getCurrentResult().status, 'idle'); stop(); client.clear();
});

test('offline queries and mutations wait for reconnection', async () => {
  const {QueryClient, MutationObserver, onlineManager} = await load(), client = new QueryClient();
  onlineManager.setOnline(false); let queries = 0, mutations = 0;
  const pending = client.fetchQuery({queryKey: ['online'], queryFn: async () => ++queries});
  const observer = new MutationObserver(client, {mutationFn: async () => ++mutations});
  const mutation = observer.mutate();
  try {
    await tick(); assert.equal(queries, 0); assert.equal(mutations, 0);
    assert.equal(client.getQueryState(['online']).fetchStatus, 'paused'); assert.equal(observer.getCurrentResult().isPaused, true);
    onlineManager.setOnline(true); assert.equal(await pending, 1); assert.equal(await mutation, 1);
  } finally { onlineManager.setOnline(true); client.clear(); }
});

test('a disabled cache reader cannot erase an active observer\'s query function', async () => {
  const {QueryClient, QueryObserver} = await load(), client = new QueryClient(); let calls = 0;
  const writer = new QueryObserver(client, {queryKey: ['shared'], queryFn: async () => ++calls, staleTime: Infinity});
  const a = writer.subscribe(() => {}); await writer.refetch({cancelRefetch: false});
  const reader = new QueryObserver(client, {queryKey: ['shared'], enabled: false}), b = reader.subscribe(() => {});
  reader.setOptions({queryKey: ['shared'], enabled: false});
  await client.invalidateQueries({queryKey: ['shared']}); assert.equal(calls, 2); assert.equal(reader.getCurrentResult().data, 2);
  a(); b(); client.clear();
});

test('exceptions in cache callbacks settle the fetch promise', async () => {
  const {QueryClient, QueryCache} = await load();
  const failure = new Error('callback failed'), client = new QueryClient({queryCache: new QueryCache({onSuccess: () => {throw failure;}})});
  await assert.rejects(client.fetchQuery({queryKey: ['callback'], queryFn: async () => 'data'}), error => error === failure);
  assert.equal(client.getQueryState(['callback']).fetchStatus, 'idle'); client.clear();
});

test('fetchQuery respects client retry defaults and retries pause while unfocused', async () => {
  const {QueryClient, focusManager} = await load();
  const client = new QueryClient({defaultOptions: {queries: {retry: 1, retryDelay: 0}}}); let calls = 0;
  focusManager.setFocused(false);
  const result = client.fetchQuery({queryKey: ['focus'], queryFn: async () => {if (++calls === 1) throw Error('temporary'); return 'ready';}});
  try {
    await tick(); await tick(); assert.equal(calls, 1);
    assert.equal(client.getQueryState(['focus']).fetchStatus, 'paused');
    focusManager.setFocused(true); assert.equal(await result, 'ready'); assert.equal(calls, 2);
  } finally {focusManager.setFocused(undefined); client.clear();}
});

test('the last observer leaving during retry delay prevents another request', async () => {
  const {QueryClient, QueryObserver} = await load(), client = new QueryClient(); let calls = 0;
  const observer = new QueryObserver(client, {queryKey: ['retry-stop'], retry: 3, retryDelay: 10, queryFn: async () => {calls++; throw Error('offline');}});
  const stop = observer.subscribe(() => {}); const promise = observer.getCurrentQuery().promise;
  await tick(); stop(); await assert.rejects(promise, /offline/); assert.equal(calls, 1); client.clear();
});

test('static observers remain cached during invalidation and report their mode to developer tools', async () => {
  const {QueryClient, QueryObserver} = await load(), client = new QueryClient(); let calls = 0;
  const observer = new QueryObserver(client, {queryKey: ['static'], staleTime: 'static', initialData: 'kept', queryFn: async () => ++calls});
  const stop = observer.subscribe(() => {});
  await client.invalidateQueries(); assert.equal(calls, 0); assert.equal(observer.getCurrentQuery().isStatic(), true);
  stop(); client.clear();
});

test('optimistic observer reads predict retry without starting requests or changing cached errors', async () => {
  const {QueryClient, QueryObserver} = await import('../query-client.js');
  const client = new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
  try {
    const queryKey = ['render-only'], failure = new Error('cached failure');
    await client.fetchQuery({queryKey,queryFn:()=>Promise.reject(failure)}).catch(()=>{});
    const before = client.getQueryState(queryKey); let calls = 0;
    const options = {queryKey,queryFn:async()=>++calls,enabled:false,_optimisticResults:'optimistic'};
    const observer = new QueryObserver(client, options);
    const result = observer.getOptimisticResult({...options,enabled:true});
    assert.equal(result.status,'pending'); assert.equal(result.fetchStatus,'fetching'); assert.equal(result.error,null);
    assert.equal(client.getQueryState(queryKey),before); assert.equal(before.error,failure); assert.equal(calls,0);
    const stopped = observer.getOptimisticResult({...options,enabled:true,retryOnMount:false});
    assert.equal(stopped.status,'error'); assert.equal(stopped.fetchStatus,'idle'); assert.equal(calls,0);
  } finally {client.clear();}
});
