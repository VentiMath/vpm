'use strict';
const assert = require('node:assert/strict'),
      fs = require('node:fs'),
      path = require('node:path'),
      {
        spawnSync
      } = require('node:child_process'),
      {
        createHash
      } = require('node:crypto');

if (!process.argv.includes('--child')) {
  for (const [file, hash] of Object.entries(require('./upstream/SHA256.json'))) assert.equal(
    createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'upstream', file))).digest('hex'),
    hash
  );

  for (const library of ['use-sync-external-store', 'external-store-legacy', 'vpm']) {
    const r = spawnSync(process.execPath, [__filename, '--child', library], {
      encoding: 'utf8',
      timeout: 60000
    });

    process.stdout.write(r.stdout);
    assert.equal(r.status, 0, r.stderr);
  }
} else (async () => {
  const library = process.argv.at(-1), target = library === 'vpm' ? path.resolve(__dirname, '../../packages/vuse-sync-external-store') : path.join(__dirname, 'node_modules', library);
  const Module = require('node:module'), resolve = Module._resolveFilename;

  Module._resolveFilename = function(name, parent, ...args) {
    if (name === 'react')
      return require.resolve('./node_modules/react');

    if (name === 'use-sync-external-store' || name.startsWith('use-sync-external-store/')) {
      const suffix = name.slice('use-sync-external-store'.length);
      const entry = library === 'vpm' ? require(target + '/package.json').exports['.' + suffix]?.require : null;
      return resolve.call(this, entry ? path.join(target, entry) : target + suffix, parent, ...args);
    }

    return resolve.call(this, name, parent, ...args);
  };

  const {
          JSDOM
        } = require('jsdom'),
        dom = new JSDOM('<!doctype html><html><body></body></html>', {
          url: 'http://localhost/'
        });

  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'Node']) Object.defineProperty(globalThis, name, {
    value: dom.window[name],
    configurable: true
  });

  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  const React = require('react'),
        {
          createRoot,
          hydrateRoot
        } = require('react-dom/client'),
        {
          renderToString
        } = require('react-dom/server'),
        {
          act
        } = React;

  const useStore = require(library === 'vpm' ? target + '/index.cjs' : target + '/shim').useSyncExternalStore;
  const useSelector = require(target + (library === 'vpm' ? '/with-selector.cjs' : '/with-selector')).useSyncExternalStoreWithSelector;
  const h = React.createElement, roots = [];
  let count = 0;

  const store = initial => {
    let value = initial;
    const listeners = new Set();

    return {
      get: () => value,

      subscribe: fn => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },

      set: next => {
        value = next;

        for (const fn of [...listeners])
          fn();
      },

      listeners
    };
  };

  async function mount(Component) {
    const el = document.createElement('div');
    document.body.append(el);
    const root = createRoot(el);
    roots.push(root);
    await act(() => root.render(h(Component)));

    return {
      el,
      root
    };
  }

  async function check(name, fn) {
    try {
      await fn();
      count++;
    } catch (e) {
      e.message = name + ': ' + e.message;
      throw e;
    }
  }

  await check('native hook identity', async () => assert.equal(useStore, React.useSyncExternalStore));

  await check('snapshot changes, Object.is and unsubscribe', async () => {
    const s = store(NaN);
    let renders = 0;

    const {
      el,
      root
    } = await mount(() => {
      renders++;
      return String(useStore(s.subscribe, s.get));
    });

    const baseline = renders;
    await act(() => s.set(NaN));
    assert.equal(renders, baseline);
    await act(() => s.set(-0));
    assert.equal(el.textContent, '0');
    const before = renders;
    await act(() => s.set(0));
    assert.ok(renders > before);
    await act(() => root.unmount());
    assert.equal(s.listeners.size, 0);
  });

  await check('selector cache computes once per stable snapshot', async () => {
    const s = store({
      n: 1
    });

    let selections = 0, renders = 0;

    const selector = x => {
      selections++;
      return x.n;
    };

    const {
      el
    } = await mount(() => {
      renders++;
      return useSelector(s.subscribe, s.get, undefined, selector);
    });

    assert.equal(selections, 1);

    await act(() => s.set({
      n: 2
    }));

    assert.equal(selections, 2);
    assert.equal(el.textContent, '2');
    assert.equal(renders, 2);
  });

  await check('equality prevents rendering and retains selected object identity', async () => {
    const s = store({
            n: 1,
            other: 0
          }),
          values = [];

    let renders = 0;

    const selector = x => ({
            n: x.n
          }),
          equal = (a, b) => a.n === b.n;

    const {
      el
    } = await mount(() => {
      renders++;
      const x = useSelector(s.subscribe, s.get, undefined, selector, equal);
      values.push(x);
      return x.n;
    });

    await act(() => s.set({
      n: 1,
      other: 2
    }));

    assert.equal(renders, 1);

    await act(() => s.set({
      n: 2,
      other: 2
    }));

    assert.equal(el.textContent, '2');
    assert.notEqual(values[0], values.at(-1));
  });

  await check('changing inline selectors reuses committed equality result', async () => {
    const s = store({
            n: 1
          }),
          values = [];

    let rerender;

    function App() {
      const [v, set] = React.useState(0);
      rerender = set;

      const x = useSelector(s.subscribe, s.get, undefined, state => ({
        n: state.n
      }), (a, b) => a.n === b.n);

      values.push(x);
      return v;
    }

    await mount(App);
    await act(() => rerender(1));
    assert.equal(values[0], values.at(-1));
  });

  await check('changed selector/equality/getter values are observed', async () => {
    const a = store({
            n: 2
          }),
          b = store({
            n: 7
          });

    let rerender;

    function App() {
      const [phase, set] = React.useState(0);
      rerender = set;
      const s = phase === 2 ? b : a;
      return useSelector(s.subscribe, s.get, undefined, x => x.n * (phase === 1 ? 3 : 1));
    }

    const {
      el
    } = await mount(App);

    await act(() => rerender(1));
    assert.equal(el.textContent, '6');
    await act(() => rerender(2));
    assert.equal(el.textContent, '7');
    assert.equal(a.listeners.size, 0);

    await act(() => b.set({
      n: 8
    }));

    assert.equal(el.textContent, '8');
  });

  await check('selector and comparator failures reach error boundaries', async () => {
    for (const mode of ['selector', 'equal']) {
      const s = store({
        n: 1
      });

      class Boundary extends React.Component {
        state = {
          error: null
        };

        static getDerivedStateFromError(error) {
          return {
            error
          };
        }

        render() {
          return this.state.error ? this.state.error.message : this.props.children;
        }
      }

      function Child() {
        return useSelector(s.subscribe, s.get, undefined, x => {
          if (mode === 'selector' && x.n === 2)
            throw Error('bad selector');

          return x.n;
        }, (a, b) => {
          if (mode === 'equal' && b === 2)
            throw Error('bad equal');

          return a === b;
        });
      }

      const old = console.error;
      console.error = () => {};

      try {
        const {
          el
        } = await mount(() => h(Boundary, null, h(Child)));

        await act(() => s.set({
          n: 2
        }));

        assert.equal(el.textContent, 'bad ' + mode);
      } finally {
        console.error = old;
      }
    }
  });

  await check('server snapshot and hydration identity', async () => {
    const s = store({
            n: 2
          }),
          server = {
            n: 1
          };

    function App() {
      return h('span', null, useSelector(s.subscribe, s.get, () => server, x => x.n));
    }

    const markup = renderToString(h(App));
    assert.equal(markup, '<span>1</span>');
    const el = document.createElement('div');
    el.innerHTML = markup;
    document.body.append(el);
    const errors = [];

    await act(() => {
      roots.push(hydrateRoot(el, h(App), {
        onRecoverableError: e => errors.push(e.message)
      }));
    });

    assert.deepEqual(errors, []);
    assert.equal(el.textContent, '2');
  });

  await check('missing server snapshot rejects SSR', async () => {
    assert.throws(
      () => renderToString(h(() => useSelector(() => () => {}, () => 1, undefined, x => x))),
      /getServerSnapshot/
    );
  });

  await check('StrictMode subscription cleanup', async () => {
    const s = store(1);

    const {
      root
    } = await mount(() => h(React.StrictMode, null, h(() => useSelector(s.subscribe, s.get, undefined, x => x))));

    assert.equal(s.listeners.size, 1);
    await act(() => root.unmount());
    assert.equal(s.listeners.size, 0);
  });

  await check('suspended render does not corrupt the committed selector', async () => {
    const s = store({
      n: 1
    });

    let set;
    const never = new Promise(() => {});

    function Reader(
      {
        mode
      }
    ) {
      const n = useSelector(s.subscribe, s.get, undefined, x => x.n * (mode ? 10 : 1));

      if (mode)
        throw never;

      return h('span', null, n);
    }

    function App() {
      const [mode, change] = React.useState(false);
      set = change;

      return h(React.Suspense, {
        fallback: 'waiting'
      }, h(Reader, {
        mode
      }));
    }

    const {
      el
    } = await mount(App);

    await act(() => React.startTransition(() => set(true)));
    assert.equal(el.textContent, '1');

    await act(() => s.set({
      n: 2
    }));

    assert.ok(['2', 'waiting'].includes(el.textContent));
    await act(() => set(false));
    assert.equal(el.textContent, '2');
  });

  await check('real React Redux 9.2.0 caller', async () => {
    const {
            Provider,
            useSelector: reduxSelector
          } = require('react-redux'),
          {
            createStore
          } = require('redux');

    const s = createStore((
      state = {
        n: 0,
        other: 0
      },
      a
    ) => a.type === 'inc' ? {
      ...state,
      n: state.n + 1
    } : a.type === 'other' ? {
      ...state,
      other: state.other + 1
    } : state);

    let renders = 0;

    const select = x => ({
            n: x.n
          }),
          eq = (a, b) => a.n === b.n;

    function App() {
      renders++;
      return reduxSelector(select, eq).n;
    }

    const {
      el
    } = await mount(() => h(Provider, {
      store: s
    }, h(App)));

    const before = renders;

    await act(() => s.dispatch({
      type: 'other'
    }));

    assert.equal(renders, before);

    await act(() => s.dispatch({
      type: 'inc'
    }));

    assert.equal(el.textContent, '1');
  });

  for (const root of roots)
    await act(() => root.unmount());

  dom.window.close();
  console.log(library + ': ' + count + ' native/selector/hydration/concurrency/React Redux cases pass.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
