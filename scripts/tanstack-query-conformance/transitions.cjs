'use strict';
const assert = require('node:assert/strict');

// Public API regression shared by source comparisons and installed archives.
// No private app code or UI-library internals are needed to exercise the boundary.
module.exports = async function checkTransitions(React, api, testing) {
  const {render, renderHook, act, waitFor, fireEvent, cleanup} = testing;
  const makeClient = () => new api.QueryClient({defaultOptions: {
    queries: {retry: false, gcTime: Infinity}, mutations: {gcTime: Infinity},
  }});
  const client = makeClient(), queued = [];
  const wrapper = ({children}) => React.createElement(api.QueryClientProvider, {client}, children);
  api.notifyManager.setScheduler(callback => queued.push(callback));
  try {
    const query = renderHook(() => api.useQuery({queryKey: ['scheduled'], initialData: 'before',
      staleTime: Infinity, queryFn: async () => 'unused'}), {wrapper});
    act(() => client.setQueryData(['scheduled'], 'after'));
    assert.equal(client.getQueryData(['scheduled']), 'after', 'cache writes remain synchronous');
    assert.equal(query.result.current.data, 'before', 'React query notifications use the scheduler');
    assert(queued.length > 0);
    act(() => {while (queued.length) queued.shift()();});
    assert.equal(query.result.current.data, 'after');
    query.unmount();

    const mutation = renderHook(() => api.useMutation({mutationFn: async () => 'saved'}), {wrapper});
    await act(async () => assert.equal(await mutation.result.current.mutateAsync(), 'saved'));
    assert.equal(mutation.result.current.status, 'idle', 'React mutation notifications use the scheduler');
    assert(queued.length > 0);
    act(() => {while (queued.length) queued.shift()();});
    assert.equal(mutation.result.current.status, 'success');
    mutation.unmount();
  } finally {
    api.notifyManager.setScheduler(callback => setTimeout(callback, 0));
    cleanup(); client.clear();
  }

  for (const mode of ['missing', 'empty', 'mutation']) {
    const client = makeClient(); let catalogCalls = 0, problemCalls = 0, mutations = 0;
    const catalogKey = ['catalog', mode, undefined];
    function RetryButton({retry}) {
      const [pending, startTransition] = React.useTransition();
      const busy = React.useRef(false);
      return React.createElement('button', {disabled: pending, onClick: () => {
        if (busy.current) return;
        busy.current = true;
        startTransition(async () => {try {await retry();} finally {busy.current = false;}});
      }}, 'Retry fixture');
    }
    function Problems({ids}) {
      const key = ['problems', ids.join(',')];
      const query = api.useQuery({queryKey: key, enabled: ids.length > 0, queryFn: async () => {
        problemCalls++; return mode === 'missing' && problemCalls === 1 ? ['first'] : ids;
      }});
      const mutation = api.useMutation({mutationFn: async () => ++mutations,
        onSuccess: () => client.refetchQueries({queryKey: catalogKey, exact: true})});
      const retry = () => mode === 'mutation' ? mutation.mutateAsync() : Promise.all([
        client.refetchQueries({queryKey: catalogKey, exact: true}),
        client.refetchQueries({queryKey: key, exact: true}),
      ]);
      if (query.isLoading) return React.createElement('span', null, 'Loading fixture');
      if (!ids.length || query.data?.length !== 2) return React.createElement(RetryButton, {retry});
      return React.createElement('output', null, query.data.join(','));
    }
    function App() {
      const catalog = api.useQuery({queryKey: catalogKey, queryFn: async () => {
        catalogCalls++; return mode !== 'missing' && catalogCalls === 1 ? [] : ['first', 'second'];
      }});
      return catalog.data ? React.createElement(Problems, {ids: catalog.data}) : null;
    }
    try {
      const view = render(React.createElement(api.QueryClientProvider, {client}, React.createElement(App)));
      fireEvent.click(await view.findByRole('button', {name: 'Retry fixture'}));
      await waitFor(() => assert.equal(view.getByRole('status').textContent, 'first,second'));
      assert.equal(view.queryByRole('button', {name: 'Retry fixture'}), null);
      assert.equal(catalogCalls, 2);
      assert.equal(problemCalls, mode === 'missing' ? 2 : 1);
      assert.equal(mutations, mode === 'mutation' ? 1 : 0);
    } finally {cleanup(); client.clear();}
  }
};
