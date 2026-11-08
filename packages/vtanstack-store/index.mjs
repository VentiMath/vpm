import api from "./index.cjs";
export const {
  createAtom,
  createAsyncAtom,
  batch,
  flush,
  Store,
  ReadonlyStore,
  createStore,
  toObserver,
  shallow,
} = api;
