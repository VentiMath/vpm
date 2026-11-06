import * as React from 'react';
import type { CreateScope } from 'vradix-react-context';
import type * as Menu from 'vradix-react-menu';
type Component<P, E = HTMLDivElement> = React.ForwardRefExoticComponent<P & React.RefAttributes<E>>;
export interface DropdownMenuProps extends Menu.MenuProps { defaultOpen?: boolean | undefined; }
export interface DropdownMenuSubProps extends Omit<DropdownMenuProps, 'dir' | 'modal'> {}
export interface DropdownMenuTriggerProps extends React.ComponentPropsWithoutRef<'button'> { asChild?: boolean | undefined; }
export interface DropdownMenuContentProps extends Omit<Menu.MenuContentProps, 'onEntryFocus'> {}
export declare const createDropdownMenuScope: CreateScope;
export declare const DropdownMenu: React.FC<DropdownMenuProps>;
export declare const DropdownMenuTrigger: Component<DropdownMenuTriggerProps, HTMLButtonElement>;
export interface DropdownMenuPortalProps extends Menu.MenuPortalProps {}
export declare const DropdownMenuPortal: React.FC<DropdownMenuPortalProps>;
export declare const DropdownMenuContent: Component<DropdownMenuContentProps>;
export interface DropdownMenuGroupProps extends Menu.MenuGroupProps {}
export declare const DropdownMenuGroup: Component<DropdownMenuGroupProps>;
export interface DropdownMenuLabelProps extends Menu.MenuLabelProps {}
export declare const DropdownMenuLabel: Component<DropdownMenuLabelProps>;
export interface DropdownMenuItemProps extends Menu.MenuItemProps {}
export declare const DropdownMenuItem: Component<DropdownMenuItemProps>;
export interface DropdownMenuCheckboxItemProps extends Menu.MenuCheckboxItemProps {}
export declare const DropdownMenuCheckboxItem: Component<DropdownMenuCheckboxItemProps>;
export interface DropdownMenuRadioGroupProps extends Menu.MenuRadioGroupProps {}
export declare const DropdownMenuRadioGroup: Component<DropdownMenuRadioGroupProps>;
export interface DropdownMenuRadioItemProps extends Menu.MenuRadioItemProps {}
export declare const DropdownMenuRadioItem: Component<DropdownMenuRadioItemProps>;
export interface DropdownMenuItemIndicatorProps extends Menu.MenuItemIndicatorProps {}
export declare const DropdownMenuItemIndicator: Component<DropdownMenuItemIndicatorProps, HTMLSpanElement>;
export interface DropdownMenuSeparatorProps extends Menu.MenuSeparatorProps {}
export declare const DropdownMenuSeparator: Component<DropdownMenuSeparatorProps>;
export interface DropdownMenuArrowProps extends Menu.MenuArrowProps {}
export declare const DropdownMenuArrow: Component<DropdownMenuArrowProps, SVGSVGElement>;
export declare const DropdownMenuSub: React.FC<DropdownMenuSubProps>;
export interface DropdownMenuSubTriggerProps extends Menu.MenuSubTriggerProps {}
export declare const DropdownMenuSubTrigger: Component<DropdownMenuSubTriggerProps>;
export interface DropdownMenuSubContentProps extends Menu.MenuSubContentProps {}
export declare const DropdownMenuSubContent: Component<DropdownMenuSubContentProps>;
export { DropdownMenu as Root, DropdownMenuTrigger as Trigger, DropdownMenuPortal as Portal, DropdownMenuContent as Content, DropdownMenuGroup as Group, DropdownMenuLabel as Label, DropdownMenuItem as Item, DropdownMenuCheckboxItem as CheckboxItem, DropdownMenuRadioGroup as RadioGroup, DropdownMenuRadioItem as RadioItem, DropdownMenuItemIndicator as ItemIndicator, DropdownMenuSeparator as Separator, DropdownMenuArrow as Arrow, DropdownMenuSub as Sub, DropdownMenuSubTrigger as SubTrigger, DropdownMenuSubContent as SubContent };
