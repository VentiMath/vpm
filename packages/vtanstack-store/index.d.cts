export interface Observer<T> {
  next?: (value: T) => void;
  error?: (error: unknown) => void;
  complete?: () => void;
}
export interface Subscription {
  unsubscribe: () => void;
}
export interface InteropSubscribable<T> {
  subscribe: (observer: Observer<T>) => Subscription;
}
export interface Subscribable<T> extends InteropSubscribable<T> {
  subscribe(observer: Observer<T>): Subscription;
  subscribe(
    next: (value: T) => void,
    error?: (error: any) => void,
    complete?: () => void,
  ): Subscription;
}
export interface Readable<T> extends Subscribable<T> {
  get: () => T;
}
export type BaseAtom<T> = Readable<T>;
export type ReadonlyAtom<T> = BaseAtom<T>;
export type Selection<T> = Readable<T>;
export type AnyAtom = BaseAtom<any>;
export interface Atom<T> extends BaseAtom<T> {
  set: ((value: T) => void) & ((updater: (previous: T) => T) => void);
}
export interface AtomOptions<T> {
  compare?: (previous: T, next: T) => boolean;
}
export function createAtom<T>(
  compute: (previous?: NoInfer<T>) => T,
  options?: AtomOptions<T>,
): ReadonlyAtom<T>;
export function createAtom<T>(value: T, options?: AtomOptions<T>): Atom<T>;
export type AsyncAtomState<T> =
  | { status: "pending" }
  | { status: "done"; data: T }
  | { status: "error"; error: unknown };
export function createAsyncAtom<T>(
  compute: () => Promise<T>,
  options?: AtomOptions<AsyncAtomState<T>>,
): ReadonlyAtom<AsyncAtomState<T>>;
export function batch(fn: () => void): void;
export function flush(): void;
export function toObserver<T>(
  next?: Observer<T> | ((value: T) => void),
  error?: (error: any) => void,
  complete?: () => void,
): Observer<T>;
export function shallow<T>(a: T, b: T): boolean;
export type StoreAction = (...args: any[]) => any;
export type StoreActionMap = Record<string, StoreAction>;
export type StoreActionsFactory<T, A extends StoreActionMap> = (store: {
  get: () => T;
  setState: (updater: (previous: T) => T) => void;
}) => A;
type NonFunction<T> = T extends (...args: any[]) => any ? never : T;
export class Store<T, A extends StoreActionMap = never> implements Readable<T> {
  constructor(compute: (previous?: NoInfer<T>) => T);
  constructor(value: T);
  constructor(value: NonFunction<T>, actions: StoreActionsFactory<T, A>);
  readonly actions: A;
  get: () => T;
  readonly state: T;
  setState: (updater: (previous: T) => T) => void;
  subscribe: Subscribable<T>["subscribe"];
}
export class ReadonlyStore<T> implements Readable<T> {
  constructor(compute: (previous?: NoInfer<T>) => T);
  constructor(value: T);
  get: () => T;
  readonly state: T;
  subscribe: Subscribable<T>["subscribe"];
}
export function createStore<T>(
  compute: (previous?: NoInfer<T>) => T,
): ReadonlyStore<T>;
export function createStore<T>(value: T): Store<T>;
export function createStore<T, A extends StoreActionMap>(
  value: NonFunction<T>,
  actions: StoreActionsFactory<T, A>,
): Store<T, A>;
