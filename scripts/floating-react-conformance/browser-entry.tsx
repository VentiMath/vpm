import * as React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  useFloating,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager,
  FloatingList,
  useListItem,
  useListNavigation,
  useTypeahead,
  offset, flip, shift, limitShift, autoUpdate,
} from "@floating-ui/react";
const Context = React.createContext<any>(null);
function Item({ label, disabled = false, asDiv = false }) {
  const Tag = asDiv ? "div" : "button";
  const { active, getItemProps } = React.useContext(Context),
    { ref, index } = useListItem({ label: disabled ? null : label });
  return (
    <Tag
      ref={ref}
      role="menuitem"
      disabled={asDiv ? undefined : disabled}
      aria-disabled={disabled}
      tabIndex={active === index ? 0 : -1}
      {...getItemProps()}
    >
      {label}
    </Tag>
  );
}
// An independently mounted toolbar hint must not take Escape away from a focused menu.
function Hint() {
  const [open, setOpen] = React.useState(true);
  const {context, refs} = useFloating({open, onOpenChange: setOpen});
  const {getFloatingProps} = useInteractions([useDismiss(context), useRole(context, {role: "tooltip"})]);
  return open ? <FloatingPortal><div ref={refs.setFloating} {...getFloatingProps()}>Hint</div></FloatingPortal> : null;
}
function App({ modal = false, menu = false, mouseMenu = false, centered = false, centerAlias = false }) {
  const [open, setOpen] = React.useState(false),
    [active, setActive] = React.useState<number | null>(null),
    listRef = React.useRef([]),
    labels = React.useRef([]);
  const { refs, context, floatingStyles } = useFloating({ open, onOpenChange: setOpen,
    placement: centered ? (centerAlias ? "bottom-center" : "bottom") as any : "bottom-start",
    middleware: [offset(4), flip({crossAxis: false, fallbackAxisSideDirection: "end"}), shift({limiter: limitShift({offset: 4})})],
    whileElementsMounted: autoUpdate,
  });
  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions(
    [
      useClick(context, {event: mouseMenu ? "mousedown" : "click"}),
      useDismiss(context, {outsidePressEvent: mouseMenu ? "mousedown" : "pointerdown"}),
      useRole(context, { role: menu ? "menu" : "dialog" }),
      useListNavigation(context, {
        enabled: menu,
        listRef,
        activeIndex: active,
        onNavigate: setActive,
        loop: true,
      }),
      useTypeahead(context, {
        enabled: menu,
        listRef: labels,
        activeIndex: active,
        onMatch: setActive,
      }),
    ],
  );
  return (
    <div>
      <button style={{marginLeft: 200, width: 100}} ref={refs.setReference} {...getReferenceProps()}>
        Open
      </button>
      <button>After</button>
      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={modal}>
            <div style={{...floatingStyles, width: centered ? 180 : 120}} ref={refs.setFloating} {...getFloatingProps()}>
              {menu ? (
                <Context.Provider value={{ active, getItemProps }}>
                  <FloatingList elementsRef={listRef} labelsRef={labels}>
                    <Item asDiv={mouseMenu} label="Alpha" />
                    <Item asDiv={mouseMenu} label="Blocked" disabled />
                    <Item asDiv={mouseMenu} label="Beta" />
                    <Item asDiv={mouseMenu} label="Bravo" />
                  </FloatingList>
                  {mouseMenu && active != null && <Hint />}
                </Context.Provider>
              ) : (
                <>
                  <button>First</button>
                  <button>Last</button>
                </>
              )}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
}
export async function run(variant: "upstream" | "vpm") {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  let checks = 0;
  const wait = async () => {
    await new Promise((resolve) => setTimeout(resolve, 60));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
  };
  const button = (text) =>
    [...document.querySelectorAll("button")].find(
      (el) => el.textContent === text,
    )!;
  const check = (value, label) => {
    if (!value)
      throw Error(label + ": focused " + document.activeElement?.outerHTML);
    checks++;
  };
  const click = async (node) => {
    const box = node.getBoundingClientRect();
    await new Promise(resolve => {
      (window as any).vpmKeyDone = resolve;
      (window as any).vpmPress(JSON.stringify({x: box.x + box.width / 2, y: box.y + box.height / 2}));
    });
    await wait();
  };
  const key = async (value) => {
    await new Promise(resolve => {
      (window as any).vpmKeyDone = resolve;
      (window as any).vpmPress(JSON.stringify({key: value}));
    });
    await wait();
  };
  const failures: string[] = [];
  try {
    flushSync(() => root.render(<App />));
    button("Open").focus();
    button("Open").click();
    await wait();
    check(document.activeElement === button("First"), "popover initial focus");
    check(
      button("Open").getAttribute("aria-controls") ===
        document.querySelector("[role=dialog]")?.id,
      "dialog ARIA",
    );
    await key("Escape");
    check(
      !document.querySelector("[role=dialog]") &&
        document.activeElement === button("Open"),
      "Escape and return focus",
    );
    flushSync(() => root.render(<App key="modal" modal />));
    button("Open").click();
    await wait();
    check(
      button("After").closest("[aria-hidden=true]") != null,
      "modal hides outside",
    );
    button("Last").focus();
    await key("Tab");
    check(
      document.activeElement === button("First"),
      "modal trailing guard wraps focus",
    );
    await key("Escape");
    flushSync(() => root.render(<App key="menu" menu />));
    button("Open").click();
    await wait();
    check(document.activeElement === button("Alpha"), "menu initial focus");
    await key("ArrowDown");
    check(document.activeElement === button("Beta"), "skip disabled");
    await key("End");
    await key("ArrowDown");
    check(document.activeElement === button("Alpha"), "menu wraps");
    await key("b");
    await key("b");
    check(document.activeElement === button("Bravo"), "typeahead cycles");
    await key("Escape");
    check(!document.querySelector("[role=menu]"), "menu item Escape");

    flushSync(() => root.render(<App key="mouse-menu" menu mouseMenu />));
    await click(button("Open"));
    const panel = document.querySelector("[role=menu]");
    if (document.activeElement !== panel) failures.push("mouse-open must focus the menu before selecting an item");
    await key("ArrowDown");
    if (document.activeElement?.textContent !== "Alpha") failures.push("first ArrowDown must select the first item");
    await key("Escape");
    if (document.querySelector("[role=menu]")) failures.push("Escape from mouse-open menu must dismiss");
    checks += 3;

    flushSync(() => root.render(<App key="centered" centered />));
    await click(button("Open"));
    const a = button("Open").getBoundingClientRect();
    const b = document.querySelector("[role=dialog]")!.getBoundingClientRect();
    if (Math.abs(a.x + a.width / 2 - b.x - b.width / 2) > 1 || Math.abs(b.y - a.bottom - 4) > 1)
      failures.push("bottom-center must center the panel with its 4px offset: " + JSON.stringify({a:a.toJSON(), b:b.toJSON()}));
    checks++;
    flushSync(() => root.render(<App key="center-alias" centered centerAlias />));
    await click(button("Open"));
    const alias = document.querySelector("[role=dialog]")!.getBoundingClientRect();
    // The current original misaligns this undeclared spelling. Check that
    // control explicitly; VPM canonicalizes it to the supported bottom value.
    if (Math.abs(alias.x - (variant === "upstream" ? a.x : b.x)) > 1 || Math.abs(alias.y - b.y) > 1)
      failures.push("center alias behavior differs from its documented control");
    checks++;
    if (failures.length) throw Error(failures.join("; "));
  } finally {
    flushSync(() => root.unmount());
    host.remove();
  }
  check(!document.querySelector("[data-floating-ui-portal]"), "portal cleanup");
  return { checks };
}
