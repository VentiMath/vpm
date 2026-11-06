import * as React from 'react';
import type { CreateScope } from 'vradix-react-context';
import type { PopperAnchorProps, PopperContentProps, PopperArrowProps } from 'vradix-react-popper';
import type { DismissableLayerProps } from 'vradix-react-dismissable-layer';
import type { PortalProps } from 'vradix-react-portal';
type Handler<E> = { bivarianceHack(event: E): void }['bivarianceHack'];
type Div = React.ComponentPropsWithoutRef<'div'> & { asChild?: boolean | undefined };
type Component<P, E = HTMLDivElement> = React.ForwardRefExoticComponent<P & React.RefAttributes<E>>;
export interface MenuProps { children?: React.ReactNode | undefined; open?: boolean | undefined; onOpenChange?: Handler<boolean> | undefined; dir?: 'ltr' | 'rtl' | undefined; modal?: boolean | undefined; }
export interface MenuAnchorProps extends PopperAnchorProps {}
export interface MenuPortalProps { children?: React.ReactNode | undefined; container?: PortalProps['container'] | undefined; forceMount?: true | undefined; }
export interface MenuContentProps extends Omit<PopperContentProps, 'dir' | 'onPlaced'>, Pick<DismissableLayerProps, 'onEscapeKeyDown' | 'onPointerDownOutside' | 'onFocusOutside' | 'onInteractOutside'> {
  forceMount?: true | undefined;
  loop?: boolean | undefined;
  onCloseAutoFocus?: Handler<Event> | undefined;
  onEntryFocus?: Handler<Event> | undefined;
}
export interface MenuGroupProps extends Div {}
export interface MenuLabelProps extends Div {}
export interface MenuItemProps extends Omit<Div, 'onSelect'> { disabled?: boolean | undefined; textValue?: string | undefined; onSelect?: Handler<Event> | undefined; }
export interface MenuCheckboxItemProps extends MenuItemProps { checked?: boolean | 'indeterminate' | undefined; onCheckedChange?: Handler<boolean> | undefined; }
export interface MenuRadioGroupProps extends MenuGroupProps { value?: string | undefined; onValueChange?: Handler<string> | undefined; }
export interface MenuRadioItemProps extends MenuItemProps { value: string; }
export interface MenuItemIndicatorProps extends React.ComponentPropsWithoutRef<'span'> { asChild?: boolean | undefined; forceMount?: true | undefined; }
export interface MenuSeparatorProps extends Div {}
export interface MenuArrowProps extends PopperArrowProps {}
export interface MenuSubProps extends Omit<MenuProps, 'dir' | 'modal'> {}
export interface MenuSubTriggerProps extends Omit<MenuItemProps, 'onSelect'> { onSelect?: React.ReactEventHandler<HTMLDivElement> | undefined; }
export interface MenuSubContentProps extends Omit<MenuContentProps, 'onCloseAutoFocus' | 'onEntryFocus' | 'side' | 'align'> { align?: 'start' | 'end' | undefined; }
export declare const createMenuScope: CreateScope;
export declare const Menu: React.FC<MenuProps>;
export declare const MenuAnchor: Component<MenuAnchorProps>;
export declare const MenuPortal: React.FC<MenuPortalProps>;
export declare const MenuContent: Component<MenuContentProps>;
export declare const MenuGroup: Component<MenuGroupProps>;
export declare const MenuLabel: Component<MenuLabelProps>;
export declare const MenuItem: Component<MenuItemProps>;
export declare const MenuCheckboxItem: Component<MenuCheckboxItemProps>;
export declare const MenuRadioGroup: Component<MenuRadioGroupProps>;
export declare const MenuRadioItem: Component<MenuRadioItemProps>;
export declare const MenuItemIndicator: Component<MenuItemIndicatorProps, HTMLSpanElement>;
export declare const MenuSeparator: Component<MenuSeparatorProps>;
export declare const MenuArrow: Component<MenuArrowProps, SVGSVGElement>;
export declare const MenuSub: React.FC<MenuSubProps>;
export declare const MenuSubTrigger: Component<MenuSubTriggerProps>;
export declare const MenuSubContent: Component<MenuSubContentProps>;
export { Menu as Root, MenuAnchor as Anchor, MenuPortal as Portal, MenuContent as Content, MenuGroup as Group, MenuLabel as Label, MenuItem as Item, MenuCheckboxItem as CheckboxItem, MenuRadioGroup as RadioGroup, MenuRadioItem as RadioItem, MenuItemIndicator as ItemIndicator, MenuSeparator as Separator, MenuArrow as Arrow, MenuSub as Sub, MenuSubTrigger as SubTrigger, MenuSubContent as SubContent };
