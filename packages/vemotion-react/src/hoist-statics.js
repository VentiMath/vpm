// Copies a component's own static properties (other than React's) onto a
// wrapper, as hoist-non-react-statics does.

const REACT_STATICS = new Set(['childContextTypes', 'contextType', 'contextTypes', 'defaultProps', 'displayName', 'getDefaultProps', 'getDerivedStateFromError', 'getDerivedStateFromProps', 'mixins', 'propTypes', 'type']);
const FUNCTION_PROPERTIES = new Set(['name', 'length', 'prototype', 'caller', 'callee', 'arguments', 'arity']);
const FORWARD_REF_STATICS = new Set(['$$typeof', 'render', 'defaultProps', 'displayName', 'propTypes']);
const MEMO_STATICS = new Set(['$$typeof', 'compare', 'defaultProps', 'displayName', 'propTypes', 'type']);
const FORWARD_REF = Symbol.for('react.forward_ref');
const MEMO = Symbol.for('react.memo');

/** The statics React itself manages on a component of this kind. */
function staticsOf(component) {
  if (component.$$typeof === MEMO) return MEMO_STATICS;
  if (component.$$typeof === FORWARD_REF) return FORWARD_REF_STATICS;
  return REACT_STATICS;
}

/**
 * @template T
 * @param {T} target
 * @param {any} source
 * @returns {T}
 */
export default function hoistStatics(target, source) {
  if (typeof source === 'string') return target;
  // Statics a class component inherits from its parent class.
  const inherited = Object.getPrototypeOf(source);
  if (inherited && inherited !== Object.prototype && inherited !== Function.prototype) hoistStatics(target, inherited);
  const targetStatics = staticsOf(target), sourceStatics = staticsOf(source);
  for (const key of [...Object.getOwnPropertyNames(source), ...Object.getOwnPropertySymbols(source)]) {
    if (FUNCTION_PROPERTIES.has(key) || REACT_STATICS.has(key) || sourceStatics.has(key) || targetStatics.has(key)) continue;
    try {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    } catch {
      // A non-configurable property of the target stays as it is.
    }
  }
  return target;
}
