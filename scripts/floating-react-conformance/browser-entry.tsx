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
} from "@floating-ui/react";
const Context = React.createContext<any>(null);
function Item({ label, disabled = false }) {
  const { active, getItemProps } = React.useContext(Context),
    { ref, index } = useListItem({ label: disabled ? null : label });
  return (
    <button
      ref={ref}
      role="menuitem"
      disabled={disabled}
      tabIndex={active === index ? 0 : -1}
      {...getItemProps()}
    >
      {label}
    </button>
  );
}
function App({ modal = false, menu = false }) {
  const [open, setOpen] = React.useState(false),
    [active, setActive] = React.useState<number | null>(null),
    listRef = React.useRef([]),
    labels = React.useRef([]);
  const { refs, context } = useFloating({ open, onOpenChange: setOpen });
  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions(
    [
      useClick(context),
      useDismiss(context),
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
    <>
      <button ref={refs.setReference} {...getReferenceProps()}>
        Open
      </button>
      <button>After</button>
      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={modal}>
            <div ref={refs.setFloating} {...getFloatingProps()}>
              {menu ? (
                <Context.Provider value={{ active, getItemProps }}>
                  <FloatingList elementsRef={listRef} labelsRef={labels}>
                    <Item label="Alpha" />
                    <Item label="Blocked" disabled />
                    <Item label="Beta" />
                    <Item label="Bravo" />
                  </FloatingList>
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
    </>
  );
}
export async function run() {
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
  const key = async (value) => {
    await new Promise(resolve => {
      (window as any).vpmKeyDone = resolve;
      (window as any).vpmPress(JSON.stringify({key: value}));
    });
    await wait();
  };
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
  } finally {
    flushSync(() => root.unmount());
    host.remove();
  }
  check(!document.querySelector("[data-floating-ui-portal]"), "portal cleanup");
  return { checks };
}
