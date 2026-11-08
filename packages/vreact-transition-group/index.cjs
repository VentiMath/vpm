"use strict";
const React = require("react");
const h = React.createElement;
const GroupContext = React.createContext(null);
const config = { disabled: false };
const lifecycle = [
  "onEnter",
  "onEntering",
  "onEntered",
  "onExit",
  "onExiting",
  "onExited",
];
const privateProps = new Set([
  "children",
  "in",
  "appear",
  "enter",
  "exit",
  "mountOnEnter",
  "unmountOnExit",
  "nodeRef",
  "timeout",
  "addEndListener",
  ...lifecycle,
]);
function forwarded(props) {
  const result = {};
  for (const key of Object.keys(props))
    if (!privateProps.has(key)) result[key] = props[key];
  return result;
}

// One cancellable operation owns both the React commit callbacks and the timer.
// Reversing direction or unmounting invalidates it before any later completion.
class Transition extends React.Component {
  static contextType = GroupContext;
  constructor(props, context) {
    super(props, context);
    const animate =
      context && !context.isMounting ? props.enter !== false : props.appear;
    this.state = {
      phase: props.in
        ? animate
          ? "exited"
          : "entered"
        : props.mountOnEnter || props.unmountOnExit
          ? "unmounted"
          : "exited",
    };
    this.operation = null;
  }
  static getDerivedStateFromProps(props, state) {
    return props.in && state.phase === "unmounted" ? { phase: "exited" } : null;
  }
  componentDidMount() {
    this.reconcile(true);
  }
  componentDidUpdate() {
    this.reconcile(false);
  }
  componentWillUnmount() {
    this.cancel();
  }
  cancel() {
    if (this.operation) {
      this.operation.active = false;
      clearTimeout(this.operation.timer);
      this.operation = null;
    }
  }
  reconcile(mounting) {
    const { phase } = this.state;
    if (this.props.in && (phase === "exited" || phase === "exiting"))
      this.begin(true, mounting);
    else if (!this.props.in && (phase === "entered" || phase === "entering"))
      this.begin(false, mounting);
    else if (!this.props.in && phase === "exited" && this.props.unmountOnExit)
      this.setState({ phase: "unmounted" });
  }
  begin(entering, mounting) {
    // onEnter/onExit may synchronously cause another parent commit.
    if (this.operation?.direction === entering) return;
    this.cancel();
    const op = (this.operation = {
      active: true,
      direction: entering,
      timer: null,
    });
    if (!this.props.nodeRef)
      throw new TypeError(
        "vreact-transition-group requires nodeRef for live transitions (React 19).",
      );
    const node = this.props.nodeRef.current;
    const appearing = !!(this.context ? this.context.isMounting : mounting);
    const offset = entering ? 0 : 3;
    const args = entering ? [appearing, undefined] : [undefined];
    const invoke = (index, values = args) =>
      this.props[lifecycle[index]]?.(...values);
    const commit = (phase, after) => {
      if (op.active)
        this.setState({ phase }, () => {
          if (op.active) after();
        });
    };
    const end = () => {
      if (!op.active) return;
      clearTimeout(op.timer);
      commit(entering ? "entered" : "exited", () => {
        op.active = false;
        if (this.operation === op) this.operation = null;
        invoke(offset + 2);
      });
    };
    if (
      config.disabled ||
      (entering
        ? !mounting && this.props.enter === false
        : this.props.exit === false)
    ) {
      commit(entering ? "entered" : "exited", () => {
        op.active = false;
        if (this.operation === op) this.operation = null;
        invoke(offset + 2, entering ? [appearing] : [undefined]);
      });
      return;
    }
    if (
      entering &&
      node &&
      (this.props.mountOnEnter || this.props.unmountOnExit)
    )
      void node.scrollTop;
    invoke(offset);
    commit(entering ? "entering" : "exiting", () => {
      invoke(offset + 1);
      if (!op.active) return;
      const timeout = this.props.timeout;
      const delay =
        typeof timeout === "object" && timeout !== null
          ? entering
            ? appearing
              ? (timeout.appear ?? timeout.enter)
              : timeout.enter
            : timeout.exit
          : timeout;
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          end();
        }
      };
      if (!node || (delay == null && !this.props.addEndListener))
        op.timer = setTimeout(done, 0);
      else {
        // Install the fallback before a synchronous listener can finish/cancel it.
        if (delay != null) op.timer = setTimeout(done, delay);
        this.props.addEndListener?.(done);
      }
    });
  }
  render() {
    if (this.state.phase === "unmounted") return null;
    const props = forwarded(this.props);
    const child =
      typeof this.props.children === "function"
        ? this.props.children(this.state.phase, props)
        : React.cloneElement(React.Children.only(this.props.children), props);
    return h(GroupContext.Provider, { value: null }, child);
  }
}

class CSSTransition extends React.Component {
  constructor(props) {
    super(props);
    this.applied = new Map();
    this.handlers = Object.fromEntries(
      lifecycle.map((name, i) => [
        name,
        (...args) => {
          const node = this.props.nodeRef?.current;
          const mode = i < 3 ? (args[0] ? "appear" : "enter") : "exit";
          const step = i % 3;
          if (step === 0) {
            for (const other of mode === "exit"
              ? ["appear", "enter"]
              : ["exit"])
              this.clear(node, other);
          }
          if (step === 2) this.clear(node, mode);
          if (step === 1 && node) void node.scrollTop;
          let tokens = this.classes(mode, step);
          if (mode === "appear" && step === 2)
            tokens.push(...this.classes("enter", 2));
          if (node && tokens.length) {
            node.classList.add(...tokens);
            this.applied.set(mode + step, { node, tokens });
          }
          this.props[name]?.(...(i < 3 ? [args[0], args[1]] : [args[0]]));
        },
      ]),
    );
  }
  classes(mode, step) {
    const names = this.props.classNames ?? "";
    const value =
      typeof names === "string"
        ? (names ? names + "-" : "") + mode + ["", "-active", "-done"][step]
        : names[mode + ["", "Active", "Done"][step]];
    return typeof value === "string" ? value.split(/\s+/).filter(Boolean) : [];
  }
  clear(node, mode) {
    for (let i = 0; i < 3; i++) {
      const key = mode + i,
        old = this.applied.get(key);
      if (old) {
        old.node.classList.remove(...old.tokens);
        this.applied.delete(key);
      }
    }
  }
  componentWillUnmount() {
    for (const old of this.applied.values())
      old.node.classList.remove(...old.tokens);
    this.applied.clear();
  }
  render() {
    const { classNames, ...props } = this.props;
    return h(Transition, { ...props, ...this.handlers });
  }
}

function groupEntries(props, previous, first, onExit) {
  const next = React.Children.toArray(props.children).filter(
    React.isValidElement,
  );
  const byKey = new Map(next.map((child) => [child.key, child]));
  const old = new Map(previous.map((entry) => [entry.child.key, entry]));
  // Walk backwards to keep departing items before their next surviving sibling.
  const before = new Map();
  let anchor = null;
  for (let i = previous.length - 1; i >= 0; i--) {
    const entry = previous[i],
      key = entry.child.key;
    if (byKey.has(key)) anchor = key;
    else {
      const list = before.get(anchor) || [];
      list.unshift({ ...entry, in: false });
      before.set(anchor, list);
    }
  }
  const result = [];
  for (const child of next) {
    result.push(...(before.get(child.key) || []));
    const entry = {
      child,
      in: true,
      onExited:
        old.get(child.key)?.onExited || ((node) => onExit(child.key, node)),
    };
    for (const option of ["appear", "enter", "exit"]) {
      entry[option] =
        option === "appear" && !first
          ? child.props.appear
          : (props[option] ?? child.props[option]);
    }
    result.push(entry);
  }
  result.push(...(before.get(null) || []));
  return result;
}
class TransitionGroup extends React.Component {
  constructor(props) {
    super(props);
    const onExit = (key, node) => this.exited(key, node);
    this.state = {
      inputs: props,
      onExit,
      entries: groupEntries(props, [], true, onExit),
      context: { isMounting: true },
    };
    this.live = false;
  }
  static getDerivedStateFromProps(props, state) {
    return props === state.inputs
      ? null
      : {
          inputs: props,
          entries: groupEntries(props, state.entries, false, state.onExit),
        };
  }
  componentDidMount() {
    this.live = true;
    this.setState({ context: { isMounting: false } });
  }
  componentWillUnmount() {
    this.live = false;
  }
  exited(key, node) {
    const entry = this.state.entries.find((item) => item.child.key === key);
    if (!entry) return;
    if (
      React.Children.toArray(this.props.children).some(
        (child) => child?.key === entry.child.key,
      )
    )
      return;
    entry.child.props.onExited?.(node);
    if (this.live)
      this.setState((state) => ({
        entries: state.entries.filter(
          (item) => item.child.key !== entry.child.key,
        ),
      }));
  }
  render() {
    const {
      component: Component = "div",
      childFactory = (child) => child,
      children: _,
      appear,
      enter,
      exit,
      ...props
    } = this.props;
    const children = this.state.entries.map((entry) =>
      childFactory(
        React.cloneElement(entry.child, {
          in: entry.in,
          appear: entry.appear,
          enter: entry.enter,
          exit: entry.exit,
          onExited: entry.onExited,
        }),
      ),
    );
    return h(
      GroupContext.Provider,
      { value: this.state.context },
      Component === null ? children : h(Component, props, children),
    );
  }
}
module.exports = { Transition, CSSTransition, TransitionGroup, config };
