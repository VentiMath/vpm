"use strict";
module.exports = async function contracts(
  React,
  createRoot,
  flushSync,
  api,
  doc = document,
) {
  const h = React.createElement,
    snapshots = [],
    hooks = [
      "onEnter",
      "onEntering",
      "onEntered",
      "onExit",
      "onExiting",
      "onExited",
    ];
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const until = async (predicate) => {
    for (let i = 0; i < 250; i++) {
      if (predicate()) return;
      await pause(5);
    }
    throw Error("Timeout: " + predicate);
  };
  let host, root;
  const open = () => {
    host = doc.createElement("div");
    doc.body.append(host);
    root = createRoot(host);
  };
  const render = (element) => flushSync(() => root.render(element));
  const close = () => {
    flushSync(() => root.unmount());
    host.remove();
  };
  for (const css of [false, true])
    for (const appear of [false, true])
      for (const mounting of [false, true])
        for (const skip of [false, true]) {
          open();
          const ref = React.createRef(),
            events = [];
          const callbacks = Object.fromEntries(
            hooks.map((name) => [
              name,
              (...args) =>
                events.push([
                  name,
                  args.map((x) => (x === undefined ? "undefined" : x)),
                  host.textContent,
                  ref.current?.className ?? null,
                ]),
            ]),
          );
          const C = css ? api.CSSTransition : api.Transition;
          const draw = (value) =>
            render(
              h(C, {
                nodeRef: ref,
                in: value,
                appear,
                enter: !skip,
                exit: !skip,
                mountOnEnter: mounting,
                unmountOnExit: mounting,
                timeout: { appear: 8, enter: 9, exit: 7 },
                ...(css
                  ? {
                      classNames: "fade",
                      children: h(
                        "span",
                        { ref, className: "keep" },
                        "content",
                      ),
                    }
                  : {
                      children: (phase, props) =>
                        h("span", { ...props, ref, className: "keep" }, phase),
                    }),
                ...callbacks,
              }),
            );
          draw(true);
          if (appear)
            await until(() => events.some((x) => x[0] === "onEntered"));
          const node = ref.current;
          draw(false);
          await until(() => events.some((x) => x[0] === "onExited"));
          if (mounting) check(host.childElementCount === 0, "Unmount on exit");
          draw(true);
          await until(
            () =>
              events.filter((x) => x[0] === "onEntered").length ===
              (appear ? 2 : 1),
          );
          if (!mounting) check(node === ref.current, "DOM identity retained");
          snapshots.push({
            css,
            appear,
            mounting,
            skip,
            events,
            html: host.innerHTML,
          });
          close();
        }
  // Interrupted transitions and stale/duplicate listener completion must not win.
  for (const css of [false, true]) {
    open();
    const ref = React.createRef(),
      events = [],
      completions = [];
    const C = css ? api.CSSTransition : api.Transition;
    const draw = (value) =>
      render(
        h(
          C,
          {
            nodeRef: ref,
            in: value,
            timeout: 300,
            addEndListener: (done) => completions.push(done),
            ...(css
              ? {
                  classNames: {
                    enter: "start one",
                    enterActive: "active two",
                    enterDone: "done",
                    exit: "leave",
                    exitActive: "leaving",
                  },
                }
              : {}),
            ...Object.fromEntries(
              hooks.map((name) => [name, () => events.push(name)]),
            ),
          },
          h("span", { ref, className: "keep" }, "stable"),
        ),
      );
    draw(false);
    draw(true);
    draw(false);
    draw(true);
    check(completions.length === 3, "Each reversal installs a new completion");
    flushSync(() => {
      completions[0]();
      completions[1]();
    });
    check(
      !events.includes("onExited") && !events.includes("onEntered"),
      "Stale completion ignored",
    );
    flushSync(() => {
      completions[2]();
      completions[2]();
    });
    check(
      events.filter((x) => x === "onEntered").length === 1,
      "One completion",
    );
    snapshots.push({ reversal: css, events, html: host.innerHTML });
    draw(false);
    close();
    const length = events.length;
    completions.at(-1)();
    await pause(3);
    check(events.length === length, "Unmount invalidates completion");
  }
  for (const useListener of [false, true]) {
    open();
    const ref = React.createRef(),
      phases = [];
    render(
      h(
        api.Transition,
        {
          in: true,
          appear: true,
          nodeRef: ref,
          timeout: useListener ? 500 : 0,
          addEndListener: useListener
            ? (done) => {
                done();
                done();
              }
            : undefined,
          onEntered: () => phases.push("entered"),
        },
        (phase) => h("div", { ref }, phase),
      ),
    );
    await until(() => phases.length);
    check(
      phases.length === 1 && host.textContent === "entered",
      "Immediate completion",
    );
    snapshots.push({ useListener, phases });
    close();
  }
  // Disabled transitions still deliver completion, with no start/intermediate hook.
  open();
  api.config.disabled = true;
  try {
    const ref = React.createRef(),
      phases = [];
    const draw = (value) =>
      render(
        h(
          api.Transition,
          {
            in: value,
            appear: true,
            nodeRef: ref,
            timeout: 100,
            ...Object.fromEntries(
              hooks.map((name) => [name, () => phases.push(name)]),
            ),
          },
          (phase) => h("span", { ref }, phase),
        ),
      );
    draw(true);
    draw(false);
    snapshots.push({ disabled: phases });
    check(phases.join() === "onEntered,onExited", "Disabled callbacks");
  } finally {
    api.config.disabled = false;
    close();
  }
  for (const wrapper of [null, "section"]) {
    open();
    const refs = new Map(),
      events = [],
      done = new Map();
    const child = (key) => {
      if (!refs.has(key)) refs.set(key, React.createRef());
      return h(
        api.CSSTransition,
        {
          key,
          nodeRef: refs.get(key),
          timeout: null,
          classNames: "item",
          addEndListener: (cb) => done.set(key, cb),
          onExited: () => events.push("exit:" + key),
          onEntered: () => events.push("enter:" + key),
        },
        h("span", { ref: refs.get(key), "data-key": key }, key),
      );
    };
    const draw = (keys, classNames = "item") =>
      render(
        h(
          api.TransitionGroup,
          {
            component: wrapper,
            childFactory: (item) => React.cloneElement(item, { classNames }),
          },
          keys.map(child),
        ),
      );
    const keys = () =>
      [...host.querySelectorAll("[data-key]")]
        .map((x) => x.dataset.key)
        .join("");
    draw(["a", "b", "c"]);
    const retained = refs.get("b").current;
    draw(["b", "d"], "changed");
    check(keys() === "abdc", "Retain departing neighbors");
    snapshots.push({
      wrapper,
      during: keys(),
      classes: [...host.querySelectorAll("[data-key]")].map((x) => x.className),
    });
    flushSync(() => {
      done.get("a")();
      done.get("c")();
      done.get("d")();
    });
    check(
      keys() === "bd" && refs.get("b").current === retained,
      "Leaving nodes removed; surviving DOM stable",
    );
    draw(["b"]);
    const stale = done.get("d");
    draw(["b", "d"]);
    flushSync(stale);
    check(keys() === "bd", "Returning key survives obsolete exit");
    flushSync(done.get("d"));
    snapshots.push({ wrapper, settled: keys(), events });
    close();
  }
  // MUI Ripple's exit effect depends on both `in` and `onExited`. Parent
  // renders must not replace its callback and restart that effect indefinitely.
  open();
  const endings = [];
  function EffectChild({ in: visible, onExited }) {
    React.useEffect(() => {
      if (!visible) endings.push(onExited);
    }, [visible, onExited]);
    return h("span", null, "ripple");
  }
  const drawEffect = (visible) =>
    render(
      h(
        api.TransitionGroup,
        { component: null },
        visible ? h(EffectChild, { key: "ripple" }) : [],
      ),
    );
  drawEffect(true);
  drawEffect(false);
  drawEffect(false);
  drawEffect(false);
  check(
    endings.length === 1,
    "Exiting child callback must stay stable across parent renders",
  );
  flushSync(endings[0]);
  check(host.textContent === "", "Effect-driven child can complete its exit");
  snapshots.push({ effectRestarts: endings.length - 1 });
  close();
  // Function children receive ordinary props but never transition control props.
  open();
  const ref = React.createRef();
  render(
    h(
      api.Transition,
      {
        nodeRef: ref,
        in: true,
        timeout: 0,
        title: "forward",
        "data-test": "ok",
      },
      (phase, props) => h("span", { ...props, ref }, phase),
    ),
  );
  snapshots.push({ forwarded: host.innerHTML });
  close();
  for (const css of [false, true]) {
    open();
    const ref = React.createRef(),
      events = [];
    const C = css ? api.CSSTransition : api.Transition;
    const draw = (value) =>
      render(
        h(
          React.StrictMode,
          null,
          h(
            C,
            {
              nodeRef: ref,
              in: value,
              appear: true,
              timeout: 1,
              ...(css ? { classNames: "strict" } : {}),
              onEntered: () => events.push("entered"),
              onExited: () => events.push("exited"),
            },
            h("div", { ref }, "strict"),
          ),
        ),
      );
    draw(true);
    await until(() => events.includes("entered"));
    draw(false);
    await until(() => events.includes("exited"));
    snapshots.push({ strict: css, html: host.innerHTML, events });
    close();
  }
  return snapshots;
};
