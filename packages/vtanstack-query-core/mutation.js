import {Subscribable, partialMatchKey, hashKey, schedule, isServer, onlineManager} from './runtime.js';

const idle = () => ({context: undefined, data: undefined, error: null, failureCount: 0, failureReason: null, isPaused: false, status: 'idle', variables: undefined, submittedAt: 0});
export function matchMutation(filters, mutation) {
  const key = mutation.options.mutationKey;
  if (filters.mutationKey && (!key || !(filters.exact ? hashKey(key) === hashKey(filters.mutationKey) : partialMatchKey(key, filters.mutationKey)))) return false;
  if (filters.status && mutation.state.status !== filters.status) return false;
  return !filters.predicate || filters.predicate(mutation);
}

export class Mutation extends Subscribable {
  observers = new Set();
  constructor(client, cache, options, id) { super(); this.client = client; this.cache = cache; this.options = options; this.mutationId = id; this.state = idle(); }
  get meta() { return this.options.meta; }
  setOptions(options) { this.options = options; }
  setState(update) {
    this.state = {...this.state, ...update};
    for (const observer of this.observers) observer.onMutationUpdate();
    this.emit(this.state); this.cache.emit({type: 'updated', mutation: this});
  }
  addObserver(observer) { this.stopGc?.(); this.observers.add(observer); }
  removeObserver(observer) { this.observers.delete(observer); this.collectLater(); }
  collectLater() { this.stopGc?.(); if (!this.observers.size && this.state.status !== 'pending') this.stopGc = schedule(() => this.cache.remove(this), this.options.gcTime ?? (isServer ? Infinity : 300000), true); }
  async execute(variables) {
    const options = this.options, context = {client: this.client, mutationKey: options.mutationKey, meta: options.meta};
    let data, optimistic;
    this.setState({...idle(), status: 'pending', variables, submittedAt: Date.now()});
    try {
      if (this.cache.config.onMutate) await this.cache.config.onMutate(variables, this, context);
      if (options.onMutate) optimistic = await options.onMutate(variables, context);
      if (optimistic !== undefined) this.setState({context: optimistic});
      let failures = 0;
      while (true) {
        try {
          if (options.networkMode !== 'always' && !onlineManager.isOnline()) {
            this.setState({isPaused: true});
            await new Promise(resolve => { const stop = onlineManager.subscribe(online => { if (online) { stop(); resolve(); } }); });
            this.setState({isPaused: false});
          }
          if (typeof options.mutationFn !== 'function') throw new Error('No mutationFn found');
          data = await options.mutationFn(variables, context); break;
        } catch (error) {
          const retry = options.retry ?? 0;
          if (!(retry === true || typeof retry === 'number' && failures < retry || typeof retry === 'function' && retry(failures, error))) throw error;
          const delay = typeof options.retryDelay === 'function' ? options.retryDelay(failures, error) : options.retryDelay ?? Math.min(1000 * 2 ** failures, 30000);
          failures++; this.setState({failureCount: failures, failureReason: error});
          await new Promise(resolve => schedule(resolve, delay));
        }
      }
      if (this.cache.config.onSuccess) await this.cache.config.onSuccess(data, variables, optimistic, this, context);
      if (options.onSuccess) await options.onSuccess(data, variables, optimistic, context);
      if (this.cache.config.onSettled) await this.cache.config.onSettled(data, null, variables, optimistic, this, context);
      if (options.onSettled) await options.onSettled(data, null, variables, optimistic, context);
      this.setState({data, error: null, status: 'success', failureCount: 0, failureReason: null});
      return data;
    } catch (error) {
      try {
        if (this.cache.config.onError) await this.cache.config.onError(error, variables, optimistic, this, context);
        if (options.onError) await options.onError(error, variables, optimistic, context);
        if (this.cache.config.onSettled) await this.cache.config.onSettled(undefined, error, variables, optimistic, this, context);
        if (options.onSettled) await options.onSettled(undefined, error, variables, optimistic, context);
      } finally { this.setState({data: undefined, error, status: 'error', failureCount: this.state.failureCount + 1, failureReason: error}); }
      throw error;
    } finally { this.collectLater(); }
  }
}

export class MutationCache extends Subscribable {
  entries = new Set(); nextId = 1;
  constructor(config = {}) { super(); this.config = config; }
  build(client, options, state) {
    const mutation = new Mutation(client, this, client.defaultMutationOptions(options), this.nextId++);
    if (state) mutation.state = state;
    this.add(mutation); return mutation;
  }
  add(mutation) { this.entries.add(mutation); this.emit({type: 'added', mutation}); }
  remove(mutation) { if (this.entries.delete(mutation)) { mutation.stopGc?.(); this.emit({type: 'removed', mutation}); } }
  clear() { for (const mutation of this.getAll()) this.remove(mutation); }
  getAll() { return [...this.entries]; }
  find(filters) { return this.findAll({exact: true, ...filters})[0]; }
  findAll(filters = {}) { return this.getAll().filter(mutation => matchMutation(filters, mutation)); }
  notify(event) { this.emit(event); }
}

export class MutationObserver extends Subscribable {
  constructor(client, options) { super(); this.client = client; this.options = client.defaultMutationOptions(options); this.mutate = this.mutate.bind(this); this.reset = this.reset.bind(this); this.update(); }
  setOptions(options) { this.options = this.client.defaultMutationOptions(options); }
  getCurrentResult() { return this.result; }
  onUnsubscribe() { if (!this.hasListeners()) this.mutation?.removeObserver(this); }
  reset() { this.mutation?.removeObserver(this); this.mutation = undefined; this.update(); }
  update() {
    const state = this.mutation?.state ?? idle();
    this.result = {...state, isIdle: state.status === 'idle', isPending: state.status === 'pending', isSuccess: state.status === 'success', isError: state.status === 'error', mutate: this.mutate, reset: this.reset};
    this.emit(this.result);
  }
  onMutationUpdate() { this.update(); }
  mutate(variables, callbacks = {}) {
    this.mutation?.removeObserver(this);
    const mutation = this.client.getMutationCache().build(this.client, this.options);
    this.mutation = mutation; mutation.addObserver(this);
    const context = {client: this.client, mutationKey: mutation.options.mutationKey, meta: mutation.options.meta};
    return mutation.execute(variables).then(data => {
      if (this.mutation === mutation && this.hasListeners()) {
        callbacks.onSuccess?.(data, variables, mutation.state.context, context);
        callbacks.onSettled?.(data, null, variables, mutation.state.context, context);
      }
      return data;
    }, error => {
      if (this.mutation === mutation && this.hasListeners()) {
        callbacks.onError?.(error, variables, mutation.state.context, context);
        callbacks.onSettled?.(undefined, error, variables, mutation.state.context, context);
      }
      throw error;
    });
  }
}
