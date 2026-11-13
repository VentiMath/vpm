import type * as React from "react";
import type { SxProps, Theme } from "vmui-system";
export interface ButtonBaseActions {
  focusVisible(): void;
}
export interface RippleActions {
  start(
    event?: unknown,
    options?: { center?: boolean },
    callback?: () => void,
  ): void;
  stop(event?: unknown, callback?: () => void): void;
  pulsate(): void;
}
export interface ButtonBaseOwnProps {
  action?: React.Ref<ButtonBaseActions>;
  children?: React.ReactNode;
  className?: string;
  classes?: Partial<Record<string, string>>;
  disabled?: boolean;
  disableRipple?: boolean;
  disableTouchRipple?: boolean;
  focusRipple?: boolean;
  centerRipple?: boolean;
  focusVisibleClassName?: string;
  onFocusVisible?: React.FocusEventHandler<HTMLElement>;
  LinkComponent?: React.ElementType;
  touchRippleRef?: React.Ref<RippleActions>;
  sx?: SxProps<Theme>;
}
export type ButtonBaseProps<C extends React.ElementType = "button"> =
  ButtonBaseOwnProps &
    Omit<React.ComponentPropsWithRef<C>, keyof ButtonBaseOwnProps> & {
      component?: C;
    };
export type ButtonColor =
  | "primary"
  | "secondary"
  | "success"
  | "error"
  | "info"
  | "warning"
  | "inherit"
  | (string & {});
export interface ButtonOwnProps extends ButtonBaseOwnProps {
  color?: ButtonColor;
  variant?: "text" | "outlined" | "contained" | (string & {});
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
  disableElevation?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  loading?: boolean | null;
  loadingIndicator?: React.ReactNode;
  loadingPosition?: "start" | "center" | "end";
}
export type ButtonProps<C extends React.ElementType = "button"> =
  ButtonOwnProps &
    Omit<React.ComponentPropsWithRef<C>, keyof ButtonOwnProps> & {
      component?: C;
    };
export interface IconButtonOwnProps extends ButtonBaseOwnProps {
  color?: ButtonColor | "default";
  size?: "small" | "medium" | "large";
  edge?: "start" | "end" | false;
  disableFocusRipple?: boolean;
  loading?: boolean | null;
  loadingIndicator?: React.ReactNode;
}
export type IconButtonProps<C extends React.ElementType = "button"> =
  IconButtonOwnProps &
    Omit<React.ComponentPropsWithRef<C>, keyof IconButtonOwnProps> & {
      component?: C;
    };
export interface FabOwnProps extends ButtonBaseOwnProps {
  color?: ButtonColor | "default";
  size?: "small" | "medium" | "large";
  variant?: "circular" | "extended";
  disableFocusRipple?: boolean;
}
export type FabProps<C extends React.ElementType = "button"> = FabOwnProps &
  Omit<React.ComponentPropsWithRef<C>, keyof FabOwnProps> & { component?: C };
export interface ButtonGroupOwnProps extends Omit<
  ButtonOwnProps,
  | "action"
  | "startIcon"
  | "endIcon"
  | "loading"
  | "loadingIndicator"
  | "loadingPosition"
> {
  orientation?: "horizontal" | "vertical";
}
export type ButtonGroupProps<C extends React.ElementType = "div"> =
  ButtonGroupOwnProps &
    Omit<React.ComponentPropsWithRef<C>, keyof ButtonGroupOwnProps> & {
      component?: C;
    };
export interface ToggleButtonOwnProps extends ButtonBaseOwnProps {
  value: unknown;
  selected?: boolean;
  color?: ButtonColor | "standard";
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
  onChange?: (event: React.MouseEvent<HTMLElement>, value: any) => void;
}
export type ToggleButtonProps<C extends React.ElementType = "button"> =
  ToggleButtonOwnProps &
    Omit<React.ComponentPropsWithRef<C>, keyof ToggleButtonOwnProps> & {
      component?: C;
    };
export interface ToggleButtonGroupOwnProps extends Omit<
  ButtonBaseOwnProps,
  | "action"
  | "focusRipple"
  | "centerRipple"
  | "touchRippleRef"
  | "disableTouchRipple"
  | "focusVisibleClassName"
  | "onFocusVisible"
  | "LinkComponent"
> {
  value?: any;
  onChange?: (event: React.MouseEvent<HTMLElement>, value: any) => void;
  exclusive?: boolean;
  color?: ButtonColor | "standard";
  size?: "small" | "medium" | "large";
  orientation?: "horizontal" | "vertical";
  fullWidth?: boolean;
}
export type ToggleButtonGroupProps<C extends React.ElementType = "div"> =
  ToggleButtonGroupOwnProps &
    Omit<React.ComponentPropsWithRef<C>, keyof ToggleButtonGroupOwnProps> & {
      component?: C;
    };
export interface Control<P, D extends React.ElementType> {
  <C extends React.ElementType>(
    props: P & { component: C } & Omit<
        React.ComponentPropsWithRef<C>,
        keyof P | "component"
      >,
  ): React.JSX.Element | null;
  (
    props: P & { href: string } & Omit<
        React.ComponentPropsWithRef<"a">,
        keyof P | "component"
      >,
  ): React.JSX.Element | null;
  (
    props: P & { component?: D } & Omit<
        React.ComponentPropsWithRef<D>,
        keyof P | "component"
      >,
  ): React.JSX.Element | null;
}
export const ButtonBase: Control<ButtonBaseOwnProps, "button">;
export const Button: Control<ButtonOwnProps, "button">;
export const IconButton: Control<IconButtonOwnProps, "button">;
export const Fab: Control<FabOwnProps, "button">;
export const ButtonGroup: Control<ButtonGroupOwnProps, "div">;
export const ToggleButton: Control<ToggleButtonOwnProps, "button">;
export const ToggleButtonGroup: Control<ToggleButtonGroupOwnProps, "div">;
export const buttonBaseClasses: Readonly<Record<string, string>>;
export function getButtonBaseUtilityClass(slot: string): string;
export const buttonClasses: Readonly<Record<string, string>>;
export function getButtonUtilityClass(slot: string): string;
export const iconButtonClasses: Readonly<Record<string, string>>;
export function getIconButtonUtilityClass(slot: string): string;
export const fabClasses: Readonly<Record<string, string>>;
export function getFabUtilityClass(slot: string): string;
export const buttonGroupClasses: Readonly<Record<string, string>>;
export function getButtonGroupUtilityClass(slot: string): string;
export const toggleButtonClasses: Readonly<Record<string, string>>;
export function getToggleButtonUtilityClass(slot: string): string;
export const toggleButtonGroupClasses: Readonly<Record<string, string>>;
export function getToggleButtonGroupUtilityClass(slot: string): string;
