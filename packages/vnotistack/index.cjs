"use strict";
const React = require("react");
const ReactDOM = require("react-dom");
const { Transition } = require("vreact-transition-group");
const cx = require("vclsx"),
  { Queue, Deadline } = require("./queue.cjs"),
  { classes } = require("./styles.cjs");
const h = React.createElement,
  Context = React.createContext(null),
  providers = [];
const useLayout =
  typeof document === "undefined" ? React.useEffect : React.useLayoutEffect;
const colors = {
  default: "#313131",
  success: "#43a047",
  error: "#d32f2f",
  warning: "#ff9800",
  info: "#2196f3",
};
function active() {
  const p = providers.at(-1);
  if (!p) throw new Error("No mounted SnackbarProvider");
  return p;
}
function enqueueSnackbar(...args) {
  return active().enqueueSnackbar(...args);
}
function closeSnackbar(key) {
  active().closeSnackbar(key);
}
function useSnackbar() {
  const value = React.useContext(Context);
  if (!value) throw new Error("useSnackbar requires a SnackbarProvider");
  return value;
}
function Icon({ variant }) {
  if (variant === "default") return null;
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const glyph =
    variant === "success"
      ? h("path", { ...common, d: "m6 12 4 4 8-8" })
      : variant === "error"
        ? h("path", { ...common, d: "m8 8 8 8m0-8-8 8" })
        : h(
            React.Fragment,
            null,
            h("path", {
              ...common,
              d: variant === "warning" ? "M12 7v6" : "M12 10v7",
            }),
            h("circle", {
              cx: 12,
              cy: variant === "warning" ? 17 : 6,
              r: 1,
              fill: "currentColor",
            }),
          );
  return h(
    "svg",
    {
      "aria-hidden": true,
      viewBox: "0 0 24 24",
      style: {
        fontSize: 20,
        width: "1em",
        height: "1em",
        marginInlineEnd: 8,
        flexShrink: 0,
      },
    },
    h("circle", { ...common, cx: 12, cy: 12, r: 10 }),
    glyph,
  );
}
const SnackbarContent = React.forwardRef(function SnackbarContent(
  { className, style, ...props },
  ref,
) {
  const c = classes(globalThis.document);
  return h("div", { ...props, ref, className: cx(c.frame, className), style });
});
const MaterialDesignContent = React.forwardRef(function MaterialDesignContent(
  {
    message,
    id,
    variant = "default",
    action,
    hideIconVariant,
    iconVariant = {},
    className,
    style,
    doc,
    ...rest
  },
  ref,
) {
  const c = classes(doc ?? globalThis.document),
    icon = hideIconVariant
      ? null
      : Object.hasOwn(iconVariant, variant)
        ? iconVariant[variant]
        : variant === "default"
          ? null
          : h(Icon, { variant });
  return h(
    "div",
    {
      ref,
      role: "alert",
      className: cx(
        c.content,
        "notistack-MuiContent",
        "notistack-MuiContent-" + variant,
        className,
      ),
      style: {
        backgroundColor: colors[variant] ?? colors.default,
        ...(icon ? { paddingLeft: 20 } : null),
        ...style,
      },
    },
    h("div", { className: c.message }, icon, message),
    action &&
      h(
        "div",
        { className: c.action },
        typeof action === "function" ? action(id) : action,
      ),
  );
});
function outside(node, origin) {
  const rect = node.getBoundingClientRect(),
    win = node.ownerDocument.defaultView;
  if (origin.horizontal === "right")
    return `translateX(${win.innerWidth - rect.left}px)`;
  if (origin.horizontal === "left") return `translateX(${-rect.right}px)`;
  return `translateY(${origin.vertical === "top" ? -rect.bottom : win.innerHeight - rect.top}px)`;
}
function Item({ entry, queue, dense, classes: overrides, doc }) {
  const node = React.useRef(null),
    wrap = React.useRef(null),
    deadline = React.useRef(),
    collapseTimer = React.useRef(),
    [collapsed, setCollapsed] = React.useState(false);
  const opts = entry.options,
    c = classes(doc),
    t = opts.transitionDuration,
    enter = typeof t === "number" ? t : (t.enter ?? 225),
    exit = typeof t === "number" ? t : (t.exit ?? 195);
  useLayout(() => {
    const win = node.current.ownerDocument.defaultView;
    const timer = (deadline.current = new Deadline(
      () => queue.request(entry, "timeout"),
      opts.persist ? null : opts.autoHideDuration,
      win,
    ));
    const blur = () => timer.pause("window"),
      focus = () => timer.resume("window");
    if (!opts.disableWindowBlurListener) {
      win.addEventListener("blur", blur);
      win.addEventListener("focus", focus);
    }
    timer.arm();
    return () => {
      timer.stop();
      win.removeEventListener("blur", blur);
      win.removeEventListener("focus", focus);
      win.clearTimeout(collapseTimer.current);
    };
  }, [entry, queue]);
  useLayout(() => {
    if (!entry.open) deadline.current?.stop();
  }, [entry.open]);
  const lifecycle = (name, ...args) => queue.lifecycle(entry, name, ...args);
  const transform = (value, ms) => {
    const el = node.current;
    el.style.transition = `transform ${ms}ms cubic-bezier(0, 0, 0.2, 1)`;
    el.style.transform = value;
  };
  const onExited = () => {
    try {
      lifecycle("onExited", node.current);
    } finally {
      const win = node.current.ownerDocument.defaultView,
        el = wrap.current;
      el.style.height = el.getBoundingClientRect().height + "px";
      void el.offsetHeight;
      setCollapsed(true);
      collapseTimer.current = win.setTimeout(() => queue.exited(entry), 175);
    }
  };
  const content = opts.content
    ? typeof opts.content === "function"
      ? opts.content(entry.id, entry.message)
      : opts.content
    : opts.Components?.[opts.variant]
      ? h(opts.Components[opts.variant], {
          ...opts,
          id: entry.id,
          message: entry.message,
        })
      : h(MaterialDesignContent, {
          ...opts,
          id: entry.id,
          message: entry.message,
          doc,
        });
  const snackbarProps = opts.SnackbarProps ?? {};
  const originKey =
    opts.anchorOrigin.vertical[0].toUpperCase() +
    opts.anchorOrigin.vertical.slice(1) +
    opts.anchorOrigin.horizontal[0].toUpperCase() +
    opts.anchorOrigin.horizontal.slice(1);
  return h(
    "div",
    {
      ref: wrap,
      className: cx("notistack-CollapseWrapper", c.wrapper, dense && c.dense),
      style: collapsed
        ? {
            height: 0,
            padding: 0,
            overflow: "hidden",
            transition: "height 175ms ease,padding 175ms ease",
          }
        : undefined,
    },
    h(
      Transition,
      {
        nodeRef: node,
        in: entry.open,
        appear: true,
        timeout: { enter, exit },
        onEnter: (appearing) => {
          transform(outside(node.current, opts.anchorOrigin), 0);
          void node.current.offsetHeight;
          lifecycle("onEnter", node.current, appearing);
        },
        onEntering: () => transform("translateX(0)", enter),
        onEntered: (appearing) => {
          try {
            lifecycle("onEntered", node.current, appearing);
          } finally {
            queue.entered(entry);
          }
        },
        onExit: () => lifecycle("onExit", node.current),
        onExiting: () =>
          transform(outside(node.current, opts.anchorOrigin), exit),
        onExited,
      },
      () =>
        h(
          "div",
          {
            ...snackbarProps,
            ref: node,
            "data-vnotistack-key": String(entry.id),
            className: cx(
              "notistack-Snackbar",
              overrides?.root,
              overrides?.["anchorOrigin" + originKey],
              snackbarProps.className,
            ),
            onMouseEnter: (e) => {
              deadline.current?.pause("hover");
              snackbarProps.onMouseEnter?.(e);
            },
            onMouseLeave: (e) => {
              deadline.current?.resume("hover");
              snackbarProps.onMouseLeave?.(e);
            },
            onFocus: (e) => {
              deadline.current?.pause("focus");
              snackbarProps.onFocus?.(e);
            },
            onBlur: (e) => {
              if (!e.currentTarget.contains(e.relatedTarget))
                deadline.current?.resume("focus");
              snackbarProps.onBlur?.(e);
            },
          },
          content,
        ),
    ),
  );
}
class SnackbarProvider extends React.Component {
  constructor(props) {
    super(props);
    this.state = { revision: 0 };
    this.mounted = false;
    this.queue = new Queue(props, () => {
      if (this.mounted) this.setState((s) => ({ revision: s.revision + 1 }));
    });
    this.enqueueSnackbar = (...args) => this.queue.enqueue(...args);
    this.closeSnackbar = (key) => this.queue.close(key);
    this.api = {
      enqueueSnackbar: this.enqueueSnackbar,
      closeSnackbar: this.closeSnackbar,
    };
  }
  componentDidMount() {
    this.mounted = true;
    this.queue.disposed = false;
    providers.push(this);
    if (this.queue.visible.length) this.forceUpdate();
  }
  componentDidUpdate(prev) {
    if (prev !== this.props) this.queue.configure(this.props);
  }
  componentWillUnmount() {
    this.mounted = false;
    const i = providers.indexOf(this);
    if (i >= 0) providers.splice(i, 1);
    // React StrictMode replays child layout effects before the parent remount.
    // Timers are cancelled by Items immediately; retain the queue until that
    // synchronous replay has had a chance to reconnect this provider.
    queueMicrotask(() => {
      if (!this.mounted) this.queue.dispose();
    });
  }
  render() {
    const props = this.props,
      doc = props.domRoot?.ownerDocument ?? globalThis.document,
      c = this.queue.visible.length ? classes(doc) : null,
      groups = new Map();
    for (const entry of this.queue.visible) {
      const { vertical, horizontal } = entry.options.anchorOrigin,
        key = vertical + "-" + horizontal;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    }
    const notifications = Array.from(groups, ([key, entries]) => {
      const { vertical, horizontal } = entries[0].options.anchorOrigin,
        origin =
          vertical[0].toUpperCase() +
          vertical.slice(1) +
          horizontal[0].toUpperCase() +
          horizontal.slice(1);
      return h(
        "div",
        {
          key,
          className: cx(
            "notistack-SnackbarContainer",
            c.container,
            c[vertical],
            c[horizontal],
            props.classes?.containerRoot,
            props.classes?.["containerAnchorOrigin" + origin],
          ),
        },
        entries.map((entry) =>
          h(Item, {
            key: typeof entry.id + ":" + entry.id,
            entry,
            queue: this.queue,
            dense: props.dense,
            classes: props.classes,
            doc,
          }),
        ),
      );
    });
    return h(
      Context.Provider,
      { value: this.api },
      props.children,
      props.domRoot
        ? ReactDOM.createPortal(notifications, props.domRoot)
        : notifications,
    );
  }
}
module.exports = {
  SnackbarProvider,
  SnackbarContent,
  MaterialDesignContent,
  useSnackbar,
  enqueueSnackbar,
  closeSnackbar,
};
