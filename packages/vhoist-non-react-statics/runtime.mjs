// Runtime is independently implemented. Contract/property names follow React
// and hoist-non-react-statics 3.3.2; see PROVENANCE.json and retained license.
const intrinsic = new Set([
  "$$typeof",
  "name",
  "length",
  "prototype",
  "caller",
  "callee",
  "arguments",
  "arity",
]);
const ordinary = new Set([
  "childContextTypes",
  "contextType",
  "contextTypes",
  "defaultProps",
  "displayName",
  "getDefaultProps",
  "getDerivedStateFromError",
  "getDerivedStateFromProps",
  "mixins",
  "propTypes",
  "type",
]);
const forwarded = new Set([
  "$$typeof",
  "render",
  "defaultProps",
  "displayName",
  "propTypes",
]);
const memoized = new Set([
  "$$typeof",
  "compare",
  "defaultProps",
  "displayName",
  "propTypes",
  "type",
]);
const memo = Symbol.for("react.memo"),
  forward = Symbol.for("react.forward_ref");
function reserved(value) {
  // Descriptor inspection never executes a component's $$typeof accessor.
  const tag = Object.getOwnPropertyDescriptor(value, "$$typeof")?.value;
  return tag === memo ? memoized : tag === forward ? forwarded : ordinary;
}
function define(target, key, descriptor) {
  // Existing nonconfigurable target properties remain untouched, as upstream.
  try {
    Object.defineProperty(target, key, descriptor);
  } catch {}
}
export default function hoistNonReactStatics(target, source, blacklist) {
  if (typeof source === "string") return target;
  if (source == null) throw new TypeError("Expected a component source");
  const targetReserved = reserved(target),
    chain = [],
    seen = new Set();
  for (
    let node = source;
    node && node !== Object.prototype && node !== Function.prototype;
    node = Object.getPrototypeOf(node)
  ) {
    if (seen.has(node))
      throw new TypeError("Component prototype chain is cyclic");
    seen.add(node);
    chain.push(node);
  }
  // Resolve the nearest declaration before defining anything. Otherwise a
  // nonconfigurable ancestor property can permanently hide its child's value.
  const plan = chain.length > 1 ? new Map() : null;
  for (let i = chain.length - 1; i >= 0; i--) {
    const node = chain[i],
      excluded = reserved(node);
    for (const key of Reflect.ownKeys(node)) {
      if (
        intrinsic.has(key) ||
        excluded.has(key) ||
        targetReserved.has(key) ||
        blacklist?.[key]
      )
        continue;
      const descriptor = Object.getOwnPropertyDescriptor(node, key);
      if (!descriptor) continue; // A proxy may remove a key after ownKeys.
      if (plan) plan.set(key, descriptor);
      else define(target, key, descriptor);
    }
  }
  if (plan)
    for (const [key, descriptor] of plan) define(target, key, descriptor);
  return target;
}
