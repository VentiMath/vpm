// React wire tags are shared protocol constants, not a dependency on React.
export const ContextConsumer = Symbol.for('react.consumer');
export const ContextProvider = Symbol.for('react.context');
export const Element = Symbol.for('react.transitional.element');
export const ForwardRef = Symbol.for('react.forward_ref');
export const Fragment = Symbol.for('react.fragment');
export const Lazy = Symbol.for('react.lazy');
export const Memo = Symbol.for('react.memo');
export const Portal = Symbol.for('react.portal');
export const Profiler = Symbol.for('react.profiler');
export const StrictMode = Symbol.for('react.strict_mode');
export const Suspense = Symbol.for('react.suspense');
export const SuspenseList = Symbol.for('react.suspense_list');
const viewTransition = Symbol.for('react.view_transition');
const clientReference = Symbol.for('react.client.reference');
const builtin = tag => tag === Fragment || tag === Suspense || tag === StrictMode || tag === Profiler || tag === SuspenseList || tag === viewTransition;
const wrapper = tag => tag === Memo || tag === ForwardRef || tag === ContextProvider || tag === ContextConsumer || tag === Lazy;
const object = value => value !== null && typeof value === 'object';

export function isElement(value) {return object(value) && value.$$typeof === Element;}
export function isPortal(value) {return object(value) && value.$$typeof === Portal;}
export function typeOf(value) {
  if (!object(value)) return undefined;
  const tag = value.$$typeof;
  if (tag === Portal) return Portal;
  if (tag !== Element) return undefined;
  const kind = value.type;
  if (builtin(kind)) return kind;
  const wrapped = kind && kind.$$typeof;
  return wrapper(wrapped) ? wrapped : Element;
}
export function isValidElementType(value) {
  const kind = typeof value;
  if (kind === 'string' || kind === 'function') return true;
  if (kind === 'symbol') return builtin(value);
  if (!object(value)) return false;
  const tag = value.$$typeof;
  return wrapper(tag) || tag === clientReference || value.getModuleId !== undefined;
}
export function isFragment(value) {return isElement(value) && value.type === Fragment;}
export function isProfiler(value) {return isElement(value) && value.type === Profiler;}
export function isStrictMode(value) {return isElement(value) && value.type === StrictMode;}
export function isSuspense(value) {return isElement(value) && value.type === Suspense;}
export function isSuspenseList(value) {return isElement(value) && value.type === SuspenseList;}
export function isContextConsumer(value) {return typeOf(value) === ContextConsumer;}
export function isContextProvider(value) {return typeOf(value) === ContextProvider;}
export function isForwardRef(value) {return typeOf(value) === ForwardRef;}
export function isLazy(value) {return typeOf(value) === Lazy;}
export function isMemo(value) {return typeOf(value) === Memo;}
export default {ContextConsumer, ContextProvider, Element, ForwardRef, Fragment, Lazy, Memo, Portal, Profiler, StrictMode, Suspense, SuspenseList, typeOf, isValidElementType, isContextConsumer, isContextProvider, isElement, isForwardRef, isFragment, isLazy, isMemo, isPortal, isProfiler, isStrictMode, isSuspense, isSuspenseList};
