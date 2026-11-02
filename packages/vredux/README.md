# vredux

An independently written, dependency-free implementation of **Redux 5.0.1**.
It supplies the store, middleware and reducer APIs used by `@hello-pangea/dnd`
18.0.1. Built and tested; not yet released or adopted by VentiMath.

```js
import { createStore } from 'vredux';
const store = createStore((count = 0, action) =>
  action.type === 'increment' ? count + 1 : count);
const unsubscribe = store.subscribe(() => console.log(store.getState()));
store.dispatch({ type: 'increment' });
unsubscribe();
```

CommonJS exports the same functions: `createStore`, `legacy_createStore`,
`combineReducers`, `bindActionCreators`, `applyMiddleware`, `compose`, `isAction`
and `isPlainObject`. The compatibility export `__DO_NOT_USE__ActionTypes` remains
available; applications should not depend on its randomly generated strings.
The observable interface, enhancer overloads, dispatch guards and reducer
replacement are preserved. Listener snapshots remain consistent when a listener
subscribes, unsubscribes or dispatches again during notification.

`combineReducers` and `bindActionCreators` preserve own `__proto__`, `constructor`
and `toString` keys. Reducers receive their own state slice rather than an inherited
Object member. Upstream controls demonstrate these deliberate corrections.
Diagnostic wording is shorter in several development errors; production error
codes and the errors checked by the original tests remain compatible.

The runtime is independently authored. The original MIT public declarations are
retained as the type contract, with attribution in [LICENSE](LICENSE); source and
tests stay in comparison fixtures. See [provenance](PROVENANCE.json).

All **78 retained public-API tests** pass on Node 24 and Bun. Five focused groups,
actual DND store/middleware checks, packed npm/Bun installs, CJS/ESM and standalone
browser bundles, and strict TypeScript 7 consumers pass. The DND check covers
store creation and FLUSH handling, not an entire browser drag lifecycle. See the
[fixture](../../scripts/redux-conformance/README.md) and
[benchmarks](bench/results/README.md) for exact boundaries and measurements.

The isolated measurements establish lower time for dispatch, eight listeners,
subscription churn and four-layer middleware on both runtimes. Eight-reducer
combination is inconclusive; no application frame-rate claim is made.
