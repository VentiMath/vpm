import type * as React from "react";
import type {
  ReferenceType,
  UseFloatingReturn as PositionReturn,
  UseFloatingOptions as PositionOptions,
} from "vfloating-ui-react-dom";
export * from "vfloating-ui-react-dom";
export type OpenChangeReason =
  | "click"
  | "hover"
  | "focus"
  | "focus-out"
  | "escape-key"
  | "outside-press"
  | "reference-press"
  | "ancestor-scroll"
  | "list-navigation";
export interface FloatingRootContext {
  open: boolean;
  onOpenChange(open: boolean, event?: Event, reason?: OpenChangeReason): void;
  floatingId: string;
  elements: {
    reference: ReferenceType | null;
    floating: HTMLElement | null;
    domReference: Element | null;
  };
  dataRef: React.MutableRefObject<{
    openEvent?: Event;
    closeReason?: OpenChangeReason;
    [key: string]: unknown;
  }>;
  events: {
    on(name: string, listener: (data: any) => void): void;
    off(name: string, listener: (data: any) => void): void;
    emit(name: string, data: any): void;
  };
}
export type FloatingContext<RT extends ReferenceType = ReferenceType> = Omit<
  UseFloatingReturn<RT>,
  "context"
> &
  FloatingRootContext;
export type UseFloatingReturn<RT extends ReferenceType = ReferenceType> = Omit<
  PositionReturn<RT>,
  "refs" | "elements"
> & {
  refs: PositionReturn<RT>["refs"] & {
    domReference: React.MutableRefObject<Element | null>;
    setPositionReference(node: ReferenceType | null): void;
  };
  elements: PositionReturn<RT>["elements"] & { domReference: Element | null };
  context: FloatingContext<RT>;
};
export type UseFloatingOptions<RT extends ReferenceType = ReferenceType> =
  PositionOptions<RT> & {
    onOpenChange?: FloatingRootContext["onOpenChange"];
    rootContext?: FloatingRootContext;
    nodeId?: string;
  };
export function useFloating<RT extends ReferenceType = ReferenceType>(
  options?: UseFloatingOptions<RT>,
): UseFloatingReturn<RT>;
export function useFloatingRootContext(options: {
  open?: boolean;
  onOpenChange?: FloatingRootContext["onOpenChange"];
  elements: { reference: ReferenceType | null; floating: HTMLElement | null };
}): FloatingRootContext;
export function useId(): string;
export type ElementProps = {
  reference?: React.HTMLProps<Element>;
  floating?: React.HTMLProps<HTMLElement>;
  item?:
    | React.HTMLProps<HTMLElement>
    | ((props: {
        active?: boolean;
        selected?: boolean;
        [key: string]: unknown;
      }) => React.HTMLProps<HTMLElement>);
};
export function useInteractions(propsList?: Array<ElementProps | void>): {
  getReferenceProps(
    userProps?: React.HTMLProps<Element>,
  ): Record<string, unknown>;
  getFloatingProps(
    userProps?: React.HTMLProps<HTMLElement>,
  ): Record<string, unknown>;
  getItemProps(
    userProps?: React.HTMLProps<HTMLElement> & {
      active?: boolean;
      selected?: boolean;
    },
  ): Record<string, unknown>;
};
export function useMergeRefs<T>(
  refs: Array<React.Ref<T> | undefined>,
): React.RefCallback<T> | null;
export interface UseClickProps {
  enabled?: boolean;
  event?: "click" | "mousedown";
  toggle?: boolean;
  ignoreMouse?: boolean;
  keyboardHandlers?: boolean;
  stickIfOpen?: boolean;
}
export function useClick(
  context: FloatingRootContext,
  options?: UseClickProps,
): ElementProps;
export interface UseDismissProps {
  enabled?: boolean;
  escapeKey?: boolean;
  outsidePress?: boolean | ((event: MouseEvent) => boolean);
  outsidePressEvent?: "pointerdown" | "mousedown" | "click";
  referencePress?: boolean;
  referencePressEvent?: "pointerdown" | "mousedown" | "click";
  ancestorScroll?: boolean;
  capture?: boolean | { escapeKey?: boolean; outsidePress?: boolean };
}
export function useDismiss(
  context: FloatingRootContext,
  options?: UseDismissProps,
): ElementProps;
export function useFocus(
  context: FloatingRootContext,
  options?: { enabled?: boolean; visibleOnly?: boolean },
): ElementProps;
export type Delay = number | { open?: number; close?: number };
export function useHover(
  context: FloatingRootContext,
  options?: {
    enabled?: boolean;
    mouseOnly?: boolean;
    move?: boolean;
    delay?: Delay;
    restMs?: number;
  },
): ElementProps;
export function useRole(
  context: FloatingRootContext,
  options?: {
    enabled?: boolean;
    role?:
      | "dialog"
      | "alertdialog"
      | "menu"
      | "tooltip"
      | "listbox"
      | "select"
      | "combobox"
      | "label"
      | "tree"
      | "grid";
  },
): ElementProps;
export function FloatingDelayGroup(props: {
  children?: React.ReactNode;
  delay: Delay;
  timeoutMs?: number;
}): React.JSX.Element;
export interface DelayGroupContext {
  delay: Delay;
  currentId: string | null;
  setCurrentId(id: string | null): void;
  isInstantPhase: boolean;
}
export function useDelayGroup(
  context: FloatingRootContext,
  options?: { id?: string; enabled?: boolean },
): DelayGroupContext;
export function useDelayGroupContext(): DelayGroupContext;
export interface FloatingPortalProps {
  children?: React.ReactNode;
  id?: string;
  root?: HTMLElement | React.MutableRefObject<HTMLElement | null> | null;
  preserveTabOrder?: boolean;
}
export function FloatingPortal(props: FloatingPortalProps): React.JSX.Element;
export interface FloatingFocusManagerProps {
  children: React.JSX.Element;
  context: FloatingContext;
  disabled?: boolean;
  initialFocus?: number | React.MutableRefObject<HTMLElement | null>;
  returnFocus?: boolean | React.MutableRefObject<HTMLElement | null>;
  restoreFocus?: boolean;
  modal?: boolean;
  guards?: boolean;
  closeOnFocusOut?: boolean;
  order?: Array<"reference" | "floating" | "content">;
  getInsideElements?: () => Element[];
  outsideElementsInert?: boolean;
}
export function FloatingFocusManager(
  props: FloatingFocusManagerProps,
): React.JSX.Element;
export function FloatingList(props: {
  children?: React.ReactNode;
  elementsRef: React.MutableRefObject<Array<HTMLElement | null>>;
  labelsRef?: React.MutableRefObject<Array<string | null>>;
}): React.JSX.Element;
export function useListItem(options?: { label?: string | null }): {
  ref: React.RefCallback<HTMLElement>;
  index: number;
};
export interface UseListNavigationProps {
  enabled?: boolean;
  listRef: React.MutableRefObject<Array<HTMLElement | null>>;
  activeIndex: number | null;
  selectedIndex?: number | null;
  onNavigate?: (index: number | null) => void;
  loop?: boolean;
  orientation?: "vertical" | "horizontal" | "both";
  rtl?: boolean;
  disabledIndices?: number[];
  focusItemOnOpen?: boolean | "auto";
  focusItemOnHover?: boolean;
  openOnArrowKeyDown?: boolean;
}
export function useListNavigation(
  context: FloatingRootContext,
  options: UseListNavigationProps,
): ElementProps;
export interface UseTypeaheadProps {
  enabled?: boolean;
  listRef: React.MutableRefObject<Array<string | null>>;
  activeIndex: number | null;
  selectedIndex?: number | null;
  onMatch?: (index: number) => void;
  onTypingChange?: (typing: boolean) => void;
  resetMs?: number;
  ignoreKeys?: string[];
  findMatch?: (
    list: Array<string | null>,
    typed: string,
  ) => string | null | undefined;
}
export function useTypeahead(
  context: FloatingRootContext,
  options: UseTypeaheadProps,
): ElementProps;
