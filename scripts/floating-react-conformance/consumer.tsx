import * as React from "react";
import {
  useFloating,
  useInteractions,
  useClick,
  useDismiss,
  useHover,
  useFocus,
  useRole,
  useMergeRefs,
  useListNavigation,
  useTypeahead,
  useListItem,
  FloatingList,
  FloatingPortal,
  FloatingFocusManager,
  FloatingDelayGroup,
  offset,
  flip,
  shift,
  limitShift,
  autoUpdate,
  type UseFloatingReturn,
  type ReferenceType,
  type Placement,
} from "vfloating-ui-react";
const placement: Placement = "bottom-start";
function Popover() {
  const [open, onOpenChange] = React.useState(false),
    [index, onNavigate] = React.useState<number | null>(null);
  const listRef = React.useRef<Array<HTMLElement | null>>([]),
    labels = React.useRef<Array<string | null>>([]);
  const f: UseFloatingReturn<ReferenceType> = useFloating({
    open,
    onOpenChange,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip(),
      shift({ limiter: limitShift({ offset: 4 }) }),
    ],
  });
  const props = useInteractions([
    useClick(f.context, { event: "mousedown", ignoreMouse: false }),
    useDismiss(f.context, { outsidePressEvent: "mousedown" }),
    useHover(f.context, {
      mouseOnly: true,
      move: false,
      restMs: 500,
      delay: { close: 50 },
    }),
    useFocus(f.context),
    useRole(f.context, { role: "menu" }),
    useListNavigation(f.context, {
      listRef,
      activeIndex: index,
      onNavigate,
      loop: true,
    }),
    useTypeahead(f.context, {
      listRef: labels,
      activeIndex: index,
      onMatch: onNavigate,
    }),
  ]);
  const item = useListItem({ label: null }),
    ref = useMergeRefs([
      f.refs.setReference,
      React.useRef<HTMLButtonElement>(null),
    ]);
  return React.createElement(
    React.Fragment,
    null,
    React.createElement("button", { ref, ...props.getReferenceProps() }),
    React.createElement(
      FloatingDelayGroup,
      { delay: 100 },
      React.createElement(
        FloatingPortal,
        null,
        React.createElement(FloatingFocusManager, {
          context: f.context,
          modal: false,
          initialFocus: 0,
          returnFocus: true,
          children: React.createElement(
            "div",
            { ref: f.refs.setFloating, ...props.getFloatingProps() },
            React.createElement(
              FloatingList,
              { elementsRef: listRef, labelsRef: labels },
              React.createElement("div", {
                ref: item.ref,
                ...props.getItemProps(),
              }),
            ),
          ),
        }),
      ),
    ),
  );
}
void Popover;
