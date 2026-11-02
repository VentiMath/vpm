import * as React from "react";
import {
  useCommit,
  useCurrent,
  useEvent,
  focus,
  native,
  editable,
} from "./shared.mjs";
const ListContext = React.createContext(null);
export function FloatingList({ children, elementsRef, labelsRef }) {
  const records = React.useRef(new Map()),
    [revision, bump] = React.useReducer((n) => n + 1, 0),
    ordered = React.useRef([]);
  const refresh = useEvent(() => {
    const items = [...records.current.keys()].sort((a, b) =>
      a.compareDocumentPosition(b) & 4
        ? -1
        : a.compareDocumentPosition(b) & 2
          ? 1
          : 0,
    );
    const labels = items.map((node) => {
      const label = records.current.get(node);
      return label === undefined ? node.textContent : label;
    });
    const changed =
      items.length !== ordered.current.length ||
      items.some((node, i) => node !== ordered.current[i]) ||
      (labelsRef && labels.some((label, i) => label !== labelsRef.current[i]));
    ordered.current = items;
    elementsRef.current = items;
    if (labelsRef) labelsRef.current = labels;
    if (changed) bump();
  });
  const register = React.useCallback(
    (node, label) => {
      records.current.set(node, label);
      refresh();
    },
    [refresh],
  );
  const unregister = React.useCallback(
    (node) => {
      records.current.delete(node);
      refresh();
    },
    [refresh],
  );
  useCommit(refresh);
  const value = React.useMemo(
    () => ({ register, unregister, ordered: ordered.current, revision }),
    [register, unregister, revision],
  );
  return React.createElement(ListContext.Provider, { value }, children);
}
export function useListItem({ label } = {}) {
  const list = React.useContext(ListContext),
    node = React.useRef(null),
    labelRef = React.useRef(label);
  labelRef.current = label;
  const register = list?.register,
    unregister = list?.unregister;
  const ref = React.useCallback(
    (value) => {
      if (node.current) unregister?.(node.current);
      node.current = value;
      if (value) register?.(value, labelRef.current);
    },
    [register, unregister],
  );
  useCommit(() => {
    if (node.current) register?.(node.current, label);
  }, [register, label]);
  return {
    ref,
    index: node.current && list ? list.ordered.indexOf(node.current) : -1,
  };
}
export function useListNavigation(context, options) {
  const state = useCurrent({ context, options }),
    lastOpen = React.useRef(false),
    opening = React.useRef(1),
    focusOnOpen = React.useRef(false);
  const navigate = useEvent((index, event) => {
    const { context: c, options: o } = state.current;
    o.onNavigate?.(index);
    if (index != null && !o.virtual) focus(o.listRef.current[index]);
    if (!c.open) c.onOpenChange(true, native(event), "list-navigation");
  });
  const available = () => {
    const o = state.current.options;
    return o.listRef.current
      .map((node, i) =>
        node &&
        !node.disabled &&
        node.getAttribute("aria-disabled") !== "true" &&
        !o.disabledIndices?.includes(i)
          ? i
          : -1,
      )
      .filter((i) => i >= 0);
  };
  useCommit(() => {
    if (options.enabled === false) return;
    if (context.open) {
      if (!context.elements.floating) return;
      if (options.activeIndex != null && !options.virtual)
        focus(options.listRef.current[options.activeIndex]);
      else if (!lastOpen.current && options.focusItemOnOpen !== false &&
        (options.selectedIndex != null || options.focusItemOnOpen === true || focusOnOpen.current)) {
        const indices = available();
        if (!indices.length) return;
        navigate(
          options.selectedIndex ??
            (opening.current < 0 ? indices.at(-1) : indices[0]) ??
            null,
        );
      }
    } else if (lastOpen.current && options.activeIndex != null)
      options.onNavigate?.(null);
    if (!context.open) focusOnOpen.current = false;
    lastOpen.current = context.open;
  }, [
    context.open,
    context.elements.floating,
    options.activeIndex,
    options.enabled,
    options.selectedIndex,
    options.focusItemOnOpen,
    navigate,
  ]);
  const key = useEvent((e) => {
    const { context: c, options: o } = state.current;
    if (e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
    const horizontal = o.orientation === "horizontal",
      both = o.orientation === "both",
      previous =
        ((horizontal || both) &&
          e.key === (o.rtl ? "ArrowRight" : "ArrowLeft")) ||
        ((!horizontal || both) && e.key === "ArrowUp"),
      next =
        ((horizontal || both) &&
          e.key === (o.rtl ? "ArrowLeft" : "ArrowRight")) ||
        ((!horizontal || both) && e.key === "ArrowDown");
    if (!previous && !next && e.key !== "Home" && e.key !== "End") return;
    if (editable(e.target) && !o.virtual) return;
    e.preventDefault();
    const indices = available();
    opening.current = previous ? -1 : 1;
    if (!c.open) {
      if (o.openOnArrowKeyDown !== false) {
        focusOnOpen.current = true;
        c.onOpenChange(true, native(e), "list-navigation");
      }
      return;
    }
    if (!indices.length) return;
    let slot = indices.indexOf(o.activeIndex),
      index;
    if (e.key === "Home") index = indices[0];
    else if (e.key === "End") index = indices.at(-1);
    else {
      slot =
        slot < 0
          ? previous
            ? indices.length - 1
            : 0
          : slot + (previous ? -1 : 1);
      if (o.loop) slot = (slot + indices.length) % indices.length;
      index = indices[Math.max(0, Math.min(slot, indices.length - 1))];
    }
    navigate(index, e);
  });
  const reference = React.useMemo(() => ({
    onKeyDown: (e) => {
      if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.isComposing &&
          ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Enter", " "].includes(e.key))
        focusOnOpen.current = true;
      key(e);
    },
    onPointerDown: (e) => {
      // A real pointer leaves selection to the first navigation key. Zero-area
      // accessibility activation and keyboard clicks request initial selection.
      focusOnOpen.current = e.width === 0 && e.height === 0;
    },
    onMouseDown: (e) => {
      if (e.detail === 0 && !native(e).pointerType) focusOnOpen.current = true;
    },
    onClick: (e) => {
      if (e.detail === 0 && !native(e).pointerType) focusOnOpen.current = true;
    },
  }), [key]);
  const floating = React.useMemo(() => ({onKeyDown: key}), [key]);
  const item = React.useMemo(
    () => ({
      onFocus: (e) => {
        const index = state.current.options.listRef.current.indexOf(
          e.currentTarget,
        );
        if (index >= 0 && index !== state.current.options.activeIndex)
          state.current.options.onNavigate?.(index);
      },
      onMouseMove: (e) => {
        const o = state.current.options;
        if (
          o.focusItemOnHover === false ||
          e.currentTarget.getAttribute("aria-disabled") === "true" ||
          e.currentTarget.disabled
        )
          return;
        const index = o.listRef.current.indexOf(e.currentTarget);
        if (index >= 0 && index !== o.activeIndex) navigate(index, e);
      },
    }),
    [state, navigate],
  );
  return options.enabled === false ? {} : { reference, floating, item };
}
export function useTypeahead(context, options) {
  const state = useCurrent({ context, options }),
    buffer = React.useRef(""),
    timer = React.useRef();
  React.useEffect(() => {
    buffer.current = "";
    clearTimeout(timer.current);
    return () => clearTimeout(timer.current);
  }, [context.open, options.enabled]);
  const key = useEvent((e) => {
    const { options: o } = state.current;
    if (
      e.defaultPrevented ||
      e.altKey ||
      e.ctrlKey ||
      e.metaKey ||
      e.isComposing ||
      o.ignoreKeys?.includes(e.key) ||
      [...e.key].length !== 1 ||
      editable(e.target)
    )
      return;
    const previous = buffer.current,
      typed = previous + e.key,
      repeating = [...typed.toLocaleLowerCase()].every(
        (c) => c === e.key.toLocaleLowerCase(),
      );
    buffer.current = typed;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      buffer.current = "";
      o.onTypingChange?.(false);
    }, o.resetMs ?? 750);
    o.onTypingChange?.(true);
    const labels = o.listRef.current,
      needle = (repeating ? e.key : typed).toLocaleLowerCase(),
      start = repeating ? (o.activeIndex ?? o.selectedIndex ?? -1) + 1 : 0;
    let match = -1;
    if (o.findMatch) {
      const label = o.findMatch(labels, needle);
      match = labels.indexOf(label);
    } else
      for (let n = 0; n < labels.length; n++) {
        const i = (start + n) % labels.length;
        if (
          labels[i] != null &&
          labels[i].toLocaleLowerCase().startsWith(needle)
        ) {
          match = i;
          break;
        }
      }
    if (match >= 0) {
      e.preventDefault();
      o.onMatch?.(match);
    }
  });
  const props = React.useMemo(() => ({ onKeyDown: key }), [key]);
  return options.enabled === false ? {} : { reference: props, floating: props };
}
