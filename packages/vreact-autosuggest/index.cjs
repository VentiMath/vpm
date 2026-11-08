"use strict";
const React = require("react");
const themeable = require("vreact-themeable");
const iterator = require("vsection-iterator");
const equalArrays = require("vshallow-equal/arrays");
const h = React.createElement;
const empty = [null, null];
const themeKeys = [
  "container",
  "containerOpen",
  "input",
  "inputOpen",
  "inputFocused",
  "suggestionsContainer",
  "suggestionsContainerOpen",
  "suggestionsList",
  "suggestion",
  "suggestionFirst",
  "suggestionHighlighted",
  "sectionContainer",
  "sectionContainerFirst",
  "sectionTitle",
];
const defaultTheme = Object.fromEntries(
  themeKeys.map((key) => [
    key,
    "react-autosuggest__" + key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()),
  ]),
);
for (const [key, base, suffix] of [
  ["containerOpen", "container", "open"],
  ["inputOpen", "input", "open"],
  ["inputFocused", "input", "focused"],
  ["suggestionsContainerOpen", "suggestions-container", "open"],
  ["suggestionFirst", "suggestion", "first"],
  ["suggestionHighlighted", "suggestion", "highlighted"],
  ["sectionContainerFirst", "section-container", "first"],
])
  defaultTheme[key] = `react-autosuggest__${base}--${suffix}`;
const inputRenderer = (props) => h("input", props);
const containerRenderer = ({ containerProps, children }) =>
  h("div", containerProps, children);
function sections(props) {
  return props.multiSection
    ? props.suggestions.map(props.getSectionSuggestions)
    : [props.suggestions];
}
function at(props, position) {
  return position[1] === null
    ? null
    : ((props.multiSection
        ? props.getSectionSuggestions(props.suggestions[position[0]])
        : props.suggestions)[position[1]] ?? null);
}
function first(props) {
  const lists = sections(props);
  for (let s = 0; s < lists.length; s++)
    if (lists[s].length) return [props.multiSection ? s : null, 0];
  return empty;
}
function refValue(ref, value) {
  if (typeof ref === "function") return ref(value);
  if (ref) ref.current = value;
}
// renderSuggestion is a pure renderer by contract. Unchanged rows survive a
// parent clock/update without invoking the renderer or replacing their DOM.
const Content = React.memo(function Content({
  render,
  suggestion,
  query,
  highlighted,
}) {
  return render(suggestion, { query, isHighlighted: highlighted });
});
class Autosuggest extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      focused: false,
      collapsed: !props.alwaysRenderSuggestions,
      position: empty,
      before: null,
      items: props.suggestions,
      multi: !!props.multiSection,
    };
    this.input = undefined;
    this.list = null;
    this.composing = false;
    this.pointer = false;
    this.scrollPending = false;
    this.keyboardNavigation = false;
    this.inputRefCleanup = null;
    this.forwardedRef = undefined;
    this.forwardedNode = null;
    this.bindInputRef = (ref, node) => {
      if (ref === this.forwardedRef && node === this.forwardedNode) return;
      if (this.inputRefCleanup) this.inputRefCleanup();
      else refValue(this.forwardedRef, null);
      this.forwardedRef = ref;
      this.forwardedNode = node;
      this.inputRefCleanup = null;
      if (node) {
        const cleanup = refValue(ref, node);
        if (typeof cleanup === "function") this.inputRefCleanup = cleanup;
      }
    };
    this.setInput = (node) => {
      this.input = node || undefined;
      this.bindInputRef(node ? this.props.inputProps.ref : undefined, node);
    };
    this.setList = (node) => {
      this.list = node;
    };
    this.focus = (event) => {
      if (this.pointer) return;
      const eligible = this.allowed(
        this.props.inputProps.value,
        "input-focused",
      );
      this.setState({
        focused: true,
        collapsed: !eligible,
        position:
          eligible && this.props.highlightFirstSuggestion
            ? first(this.props)
            : empty,
      });
      this.props.inputProps.onFocus?.(event);
      if (eligible) this.fetch(this.props.inputProps.value, "input-focused");
    };
    this.blur = (event) => {
      if (this.pointer) return;
      const suggestion = at(this.props, this.state.position);
      this.setState({
        focused: false,
        collapsed: true,
        position: empty,
        before: null,
      });
      this.props.inputProps.onBlur?.(event, {
        highlightedSuggestion: suggestion,
      });
      if (!this.props.alwaysRenderSuggestions)
        this.props.onSuggestionsClearRequested?.();
    };
    this.change = (event) => {
      const value = event.target.value,
        eligible = this.allowed(value, "input-changed");
      // Filtering may return the same items for several consecutive keystrokes.
      // Apply the first-result policy here as well as when a new list arrives.
      this.setState({
        before: null,
        position:
          eligible && this.props.highlightFirstSuggestion
            ? first(this.props)
            : empty,
        collapsed: !eligible,
      });
      this.changeValue(event, value, "type");
      if (eligible) this.fetch(value, "input-changed");
      else this.props.onSuggestionsClearRequested?.();
    };
    this.key = (event) => {
      this.props.inputProps.onKeyDown?.(event);
      if (
        event.defaultPrevented ||
        this.composing ||
        event.nativeEvent?.isComposing ||
        event.keyCode === 229
      )
        return;
      const key =
        event.key ||
        { 38: "ArrowUp", 40: "ArrowDown", 13: "Enter", 27: "Escape" }[
          event.keyCode
        ];
      if (key === "ArrowDown" || key === "ArrowUp") {
        event.preventDefault();
        const value = this.props.inputProps.value;
        if (!this.open()) {
          if (this.allowed(value, "suggestions-revealed")) {
            this.setState({ collapsed: false });
            this.fetch(value, "suggestions-revealed");
          }
          return;
        }
        const lists = sections(this.props),
          grouped = !!this.props.multiSection;
        const step = iterator({
          data: grouped ? lists.map((x) => x.length) : lists[0].length,
          multiSection: grouped,
        });
        const position = step[key === "ArrowDown" ? "next" : "prev"](
          this.state.position,
        );
        const before = this.state.before ?? value;
        this.scrollPending = true;
        this.keyboardNavigation = true;
        this.setState({ position, before });
        const suggestion = at(this.props, position);
        this.changeValue(
          event,
          suggestion === null
            ? before
            : this.props.getSuggestionValue(suggestion),
          key === "ArrowDown" ? "down" : "up",
        );
      } else if (key === "Enter") {
        if (this.open() && this.state.position[1] !== null) {
          event.preventDefault();
          this.select(event, this.state.position, "enter");
        } else
          this.setState({ collapsed: true, position: empty, before: null });
      } else if (key === "Escape") {
        const opened = this.open() && !this.props.alwaysRenderSuggestions,
          before = this.state.before;
        this.setState({
          collapsed: true,
          position:
            this.props.alwaysRenderSuggestions &&
            this.props.highlightFirstSuggestion
              ? first(this.props)
              : empty,
          before: null,
        });
        if (before !== null) this.changeValue(event, before, "escape");
        else if (!opened) {
          this.changeValue(event, "", "escape");
          if (this.allowed("", "escape-pressed")) {
            this.setState({ collapsed: false });
            this.fetch("", "escape-pressed");
          }
        }
        if (
          !this.props.alwaysRenderSuggestions &&
          (opened || !this.allowed("", "escape-pressed"))
        )
          this.props.onSuggestionsClearRequested?.();
        if (opened) event.preventDefault();
      }
    };
    this.startComposition = (event) => {
      this.composing = true;
      this.props.inputProps.onCompositionStart?.(event);
    };
    this.endComposition = (event) => {
      this.composing = false;
      this.props.inputProps.onCompositionEnd?.(event);
    };
  }
  static getDerivedStateFromProps(props, state) {
    if (
      props.suggestions === state.items &&
      !!props.multiSection === state.multi
    )
      return null;
    const changed =
      !!props.multiSection !== state.multi ||
      !equalArrays(props.suggestions, state.items);
    const update = { items: props.suggestions, multi: !!props.multiSection };
    if (changed) {
      update.position = props.highlightFirstSuggestion ? first(props) : empty;
      // A newly delivered result list may reopen after a reveal/fetch; a blur
      // still prevents it from being displayed.
      if (state.focused) update.collapsed = false;
    }
    return update;
  }
  allowed(value, reason) {
    return (
      this.props.alwaysRenderSuggestions ||
      (this.props.shouldRenderSuggestions
        ? this.props.shouldRenderSuggestions(value, reason)
        : value.trim().length > 0)
    );
  }
  fetch(value, reason) {
    this.props.onSuggestionsFetchRequested({ value, reason });
  }
  open() {
    return !!(
      sections(this.props).some((x) => x.length) &&
      (this.props.alwaysRenderSuggestions ||
        (this.state.focused &&
          !this.state.collapsed &&
          this.allowed(this.props.inputProps.value, "render")))
    );
  }
  changeValue(event, value, method) {
    if (value !== this.props.inputProps.value)
      this.props.inputProps.onChange(event, { newValue: value, method });
  }
  select(event, position, method) {
    const suggestion = at(this.props, position);
    if (suggestion === null) return;
    const value = this.props.getSuggestionValue(suggestion);
    const keep =
      this.props.alwaysRenderSuggestions ||
      this.props.shouldKeepSuggestionsOnSelect?.(suggestion);
    this.changeValue(event, value, method);
    this.props.onSuggestionSelected?.(event, {
      suggestion,
      suggestionValue: value,
      suggestionIndex: position[1],
      sectionIndex: position[0],
      method,
    });
    this.setState({ position: empty, before: null, collapsed: !keep });
    if (keep) this.fetch(value, "suggestion-selected");
    else this.props.onSuggestionsClearRequested?.();
    if (method === "click") {
      this.pointer = true;
      if (this.props.focusInputOnSuggestionClick === false) this.input?.blur();
      else this.input?.focus();
      this.pointer = false;
      this.setState({
        focused: this.props.focusInputOnSuggestionClick !== false,
      });
    }
  }
  componentDidUpdate(previous, old) {
    const was = at(previous, old.position),
      now = at(this.props, this.state.position);
    if (was !== now) this.props.onSuggestionHighlighted?.({ suggestion: now });
    if (previous.inputProps.ref !== this.props.inputProps.ref)
      this.bindInputRef(this.props.inputProps.ref, this.input || null);
    if (this.scrollPending) {
      this.scrollPending = false;
      const node = this.list?.ownerDocument.getElementById(
        this.itemId(this.state.position),
      );
      if (node && this.list) {
        const a = node.getBoundingClientRect(),
          b = this.list.getBoundingClientRect();
        if (a.bottom > b.bottom) this.list.scrollTop += a.bottom - b.bottom;
        else if (a.top < b.top) this.list.scrollTop -= b.top - a.top;
      }
    }
  }
  itemId([section, index]) {
    return `react-autowhatever-${this.props.id ?? "1"}${section === null ? "-" : "-section-" + section}-item-${index}`;
  }
  render() {
    const p = this.props,
      opened = this.open(),
      id = `react-autowhatever-${p.id ?? "1"}`;
    const theme = themeable(p.theme || defaultTheme),
      query = (this.state.before ?? p.inputProps.value).trim();
    const inputProps = {
      type: "text",
      value: p.inputProps.value,
      autoComplete: "off",
      "aria-autocomplete": "list",
      "aria-controls": id,
      "aria-activedescendant":
        opened && this.state.position[1] !== null
          ? this.itemId(this.state.position)
          : undefined,
      ...theme(
        "input",
        "input",
        opened && "inputOpen",
        this.state.focused && "inputFocused",
      ),
      ...p.inputProps,
      ref: this.setInput,
      onFocus: this.focus,
      onBlur: this.blur,
      onChange: this.change,
      onKeyDown: this.key,
      onCompositionStart: this.startComposition,
      onCompositionEnd: this.endComposition,
    };
    const lists = sections(p);
    const list = (items, section) =>
      h(
        "ul",
        { role: "listbox", ...theme("items-list", "suggestionsList") },
        items.map((suggestion, index) => {
          const position = [section, index],
            selected =
              section === this.state.position[0] &&
              index === this.state.position[1];
          return h(
            "li",
            {
              ...theme(
                index,
                "suggestion",
                index === 0 && "suggestionFirst",
                selected && "suggestionHighlighted",
              ),
              id: this.itemId(position),
              role: "option",
              "aria-selected": selected,
              "data-suggestion-index": index,
              ...(section === null ? {} : { "data-section-index": section }),
              onMouseMove: () => {
                this.keyboardNavigation = false;
                if (
                  section !== this.state.position[0] ||
                  index !== this.state.position[1]
                )
                  this.setState({ position });
              },
              onMouseLeave: () => {
                if (!this.keyboardNavigation)
                  this.setState({ position: empty });
              },
              onMouseDown: (event) => {
                if (event.button === 0) event.preventDefault();
              },
              onClick: (event) => this.select(event, position, "click"),
            },
            h(Content, {
              render: p.renderSuggestion,
              suggestion,
              query,
              highlighted: selected,
            }),
          );
        }),
      );
    const children = opened
      ? p.multiSection
        ? lists.map((items, s) => {
            if (!items.length) return null;
            const title = p.renderSectionTitle?.(p.suggestions[s]);
            return h(
              "div",
              theme(s, "sectionContainer", s === 0 && "sectionContainerFirst"),
              title == null
                ? null
                : h("div", theme("title", "sectionTitle"), title),
              list(items, s),
            );
          })
        : list(lists[0], null)
      : null;
    const containerProps = {
      id,
      role: "listbox",
      ...theme(
        "suggestions-container",
        "suggestionsContainer",
        opened && "suggestionsContainerOpen",
      ),
      ref: this.setList,
    };
    return h(
      "div",
      {
        role: "combobox",
        "aria-haspopup": "listbox",
        "aria-expanded": opened,
        "aria-owns": id,
        ...theme("container", "container", opened && "containerOpen"),
        ...p.containerProps,
      },
      (p.renderInputComponent || inputRenderer)(inputProps),
      (p.renderSuggestionsContainer || containerRenderer)({
        containerProps,
        children,
        query,
      }),
    );
  }
}
module.exports = Autosuggest;
