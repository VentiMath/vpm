import type * as React from 'react';
import type { CreateScope, Scope } from 'vradix-react-context';
import type { Primitive } from 'vradix-react-primitive';
type ScopeProp = { __scopeRovingFocusGroup?: Scope | undefined };
export interface RovingFocusGroupProps extends Omit<React.ComponentPropsWithoutRef<typeof Primitive.div>, 'dir'>, ScopeProp {
  orientation?: 'horizontal' | 'vertical' | undefined;
  dir?: 'ltr' | 'rtl' | undefined;
  loop?: boolean | undefined;
  currentTabStopId?: string | null | undefined;
  defaultCurrentTabStopId?: string | undefined;
  onCurrentTabStopIdChange?: ((id: string | null) => void) | undefined;
  onEntryFocus?: ((event: Event) => void) | undefined;
  preventScrollOnEntryFocus?: boolean | undefined;
}
export interface RovingFocusItemProps extends Omit<React.ComponentPropsWithoutRef<typeof Primitive.span>, 'children'>, ScopeProp {
  tabStopId?: string | undefined;
  focusable?: boolean | undefined;
  active?: boolean | undefined;
  children?: React.ReactNode | ((state: {hasTabStop:boolean;isCurrentTabStop:boolean}) => React.ReactNode);
}
export declare const RovingFocusGroup: React.ForwardRefExoticComponent<RovingFocusGroupProps & React.RefAttributes<HTMLDivElement>>;
export declare const RovingFocusGroupItem: React.ForwardRefExoticComponent<RovingFocusItemProps & React.RefAttributes<HTMLSpanElement>>;
export declare const createRovingFocusGroupScope: CreateScope;
export { RovingFocusGroup as Root, RovingFocusGroupItem as Item };
