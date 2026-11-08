import {
  createAtom,
  createStore,
  createAsyncAtom,
  Store,
  ReadonlyStore,
  batch,
  flush,
  shallow,
  toObserver,
  type Atom,
  type ReadonlyAtom,
  type Subscription,
} from "vtanstack-store";
const count: Atom<number> = createAtom(1);
count.set((x) => x + 1);
const doubled: ReadonlyAtom<number> = createAtom(() => count.get() * 2);
// @ts-expect-error computed atoms are read-only
doubled.set(4);
const unsub: Subscription = doubled.subscribe({
  next(value) {
    const n: number = value;
    void n;
  },
});
unsub.unsubscribe();
const store = createStore({ count: 0 }, (s) => ({
  increment(n: number) {
    s.setState((x) => ({ count: x.count + n }));
    return s.get().count;
  },
}));
const result: number = store.actions.increment(2);
const computed = createStore(() => store.state.count);
// @ts-expect-error computed stores have no mutation API
computed.setState(() => 1);
const legacy = new Store(1);
legacy.setState((x) => x + 1);
const read = new ReadonlyStore(() => legacy.get());
const asyncValue = createAsyncAtom(async () => ({ n: 2 })).get();
if (asyncValue.status === "done") {
  const n: number = asyncValue.data.n;
  void n;
}
batch(() => count.set(4));
flush();
const equal: boolean = shallow({ a: 1 }, { a: 2 });
toObserver<number>((x) => x + 1);
void [result, read, equal];
