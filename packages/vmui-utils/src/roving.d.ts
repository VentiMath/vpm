import type * as React from "react";
export interface Item<K = unknown> {
  id: K;
  element: HTMLElement | null;
  disabled: boolean;
  focusableWhenDisabled: boolean;
  textValue?: string;
  selected: boolean;
}
export interface UseRovingTabIndexParams<K = unknown> {
  activeItemId?: K | null;
  getDefaultActiveItemId?: (items: Item<K>[]) => K | null;
  orientation: "horizontal" | "vertical";
  isRtl?: boolean;
  isItemFocusable?: (item: Item<K>) => boolean;
  wrap?: boolean;
}
export interface UseRovingTabIndexReturnValue<K = unknown> {
  activeItemId: K | null;
  focusNext: (filter?: (item: Item<K>) => boolean) => K | null;
  getActiveItem: () => Item<K> | null;
  getItemMap: () => Map<K, Item<K>>;
  isItemActive: (id: K) => boolean;
  registerItem: (item: Item<K>) => void;
  unregisterItem: (id: K) => void;
  setActiveItemId: (id: K | null) => void;
  getContainerProps: (
    ref?: React.Ref<HTMLElement>,
    onFocus?: React.FocusEventHandler<HTMLElement>,
    onKeyDown?: React.KeyboardEventHandler<HTMLElement>,
  ) => {
    ref: React.RefCallback<HTMLElement>;
    onFocus: React.FocusEventHandler<HTMLElement>;
    onKeyDown: React.KeyboardEventHandler<HTMLElement>;
  };
}
export interface UseRovingTabIndexItemParams<K = unknown> {
  id: K;
  ref?: React.Ref<HTMLElement>;
  disabled?: boolean;
  focusableWhenDisabled?: boolean;
  textValue?: string;
  selected?: boolean;
}
export interface UseRovingTabIndexItemReturnValue {
  ref: React.RefCallback<HTMLElement> | null;
  tabIndex: number;
}
export const RovingTabIndexContext: React.Context<
  UseRovingTabIndexReturnValue<any> | undefined
>;
export function useRovingTabIndexContext(): UseRovingTabIndexReturnValue<any>;
export function isItemFocusable(item: Item): boolean;
export function useRovingTabIndexRoot<K = unknown>(
  parameters: UseRovingTabIndexParams<K>,
): UseRovingTabIndexReturnValue<K>;
export function useRovingTabIndexItem<K = unknown>(
  parameters: UseRovingTabIndexItemParams<K>,
): UseRovingTabIndexItemReturnValue;
