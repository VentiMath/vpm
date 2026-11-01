// Private lexical bindings keep classification independent of mutable public exports.
const api = (() => {
// React wire tags are shared protocol constants, not a dependency on React.
const ContextConsumer = Symbol.for('react.consumer');
const ContextProvider = Symbol.for('react.context');
const Element = Symbol.for('react.transitional.element');
const ForwardRef = Symbol.for('react.forward_ref');
const Fragment = Symbol.for('react.fragment');
const Lazy = Symbol.for('react.lazy');
const Memo = Symbol.for('react.memo');
const Portal = Symbol.for('react.portal');
const Profiler = Symbol.for('react.profiler');
const StrictMode = Symbol.for('react.strict_mode');
const Suspense = Symbol.for('react.suspense');
const SuspenseList = Symbol.for('react.suspense_list');
const viewTransition = Symbol.for('react.view_transition');
const clientReference = Symbol.for('react.client.reference');
const builtin = tag => tag === Fragment || tag === Suspense || tag === StrictMode || tag === Profiler || tag === SuspenseList || tag === viewTransition;
const wrapper = tag => tag === Memo || tag === ForwardRef || tag === ContextProvider || tag === ContextConsumer || tag === Lazy;

function isElement(value) {return (value !== null && typeof value === 'object') && value.$$typeof === Element;}
function isPortal(value) {return (value !== null && typeof value === 'object') && value.$$typeof === Portal;}
function typeOf(value) {
  if (!(value !== null && typeof value === 'object')) return undefined;
  const tag = value.$$typeof;
  if (tag === Portal) return Portal;
  if (tag !== Element) return undefined;
  const kind = value.type;
  if (typeof kind === 'symbol' && builtin(kind)) return kind;
  const wrapped = kind && kind.$$typeof;
  return wrapped === undefined ? Element : wrapper(wrapped) ? wrapped : Element;
}
function isValidElementType(value) {
  const kind = typeof value;
  if (kind === 'string' || kind === 'function') return true;
  if (kind === 'symbol') return builtin(value);
  if (!(value !== null && typeof value === 'object')) return false;
  const tag = value.$$typeof;
  return wrapper(tag) || tag === clientReference || value.getModuleId !== undefined;
}
function isFragment(value) {return value !== null && typeof value === 'object' && value.$$typeof === Element && value.type === Fragment;}
function isProfiler(value) {return value !== null && typeof value === 'object' && value.$$typeof === Element && value.type === Profiler;}
function isStrictMode(value) {return value !== null && typeof value === 'object' && value.$$typeof === Element && value.type === StrictMode;}
function isSuspense(value) {return value !== null && typeof value === 'object' && value.$$typeof === Element && value.type === Suspense;}
function isSuspenseList(value) {return value !== null && typeof value === 'object' && value.$$typeof === Element && value.type === SuspenseList;}
function isContextConsumer(value) {return typeOf(value) === ContextConsumer;}
function isContextProvider(value) {return typeOf(value) === ContextProvider;}
function isForwardRef(value) {return typeOf(value) === ForwardRef;}
function isLazy(value) {return typeOf(value) === Lazy;}
function isMemo(value) {return typeOf(value) === Memo;}
return {ContextConsumer, ContextProvider, Element, ForwardRef, Fragment, Lazy, Memo, Portal, Profiler, StrictMode, Suspense, SuspenseList, typeOf, isValidElementType, isContextConsumer, isContextProvider, isElement, isForwardRef, isFragment, isLazy, isMemo, isPortal, isProfiler, isStrictMode, isSuspense, isSuspenseList};
})();
export const {ContextConsumer, ContextProvider, Element, ForwardRef, Fragment, Lazy, Memo, Portal, Profiler, StrictMode, Suspense, SuspenseList, typeOf, isValidElementType, isContextConsumer, isContextProvider, isElement, isForwardRef, isFragment, isLazy, isMemo, isPortal, isProfiler, isStrictMode, isSuspense, isSuspenseList} = api;
export default api;
