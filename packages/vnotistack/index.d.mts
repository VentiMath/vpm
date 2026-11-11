import * as React from "react";
export type SnackbarKey = string | number;
export type SnackbarMessage = React.ReactNode;
export type VariantType = "default" | "success" | "error" | "warning" | "info";
export type CloseReason = "timeout" | "maxsnack" | "instructed";
export interface SnackbarOrigin {
  vertical: "top" | "bottom";
  horizontal: "left" | "center" | "right";
}
export type SnackbarAction =
  | React.ReactNode
  | ((key: SnackbarKey) => React.ReactNode);
export interface SharedProps {
  variant?: VariantType;
  autoHideDuration?: number | null;
  anchorOrigin?: SnackbarOrigin;
  preventDuplicate?: boolean;
  persist?: boolean;
  disableWindowBlurListener?: boolean;
  hideIconVariant?: boolean;
  iconVariant?: Partial<Record<VariantType, React.ReactNode>>;
  action?: SnackbarAction;
  content?:
    | React.ReactNode
    | ((key: SnackbarKey, message: SnackbarMessage) => React.ReactNode);
  style?: React.CSSProperties;
  className?: string;
  SnackbarProps?: React.HTMLAttributes<HTMLDivElement>;
  transitionDuration?: number | { enter?: number; exit?: number };
  onClose?: (
    event: React.SyntheticEvent | Event | null,
    reason: CloseReason,
    key?: SnackbarKey,
  ) => void;
  onEnter?: (node: HTMLElement, isAppearing: boolean, key: SnackbarKey) => void;
  onEntered?: (
    node: HTMLElement,
    isAppearing: boolean,
    key: SnackbarKey,
  ) => void;
  onExit?: (node: HTMLElement, key: SnackbarKey) => void;
  onExited?: (node: HTMLElement, key: SnackbarKey) => void;
  /** Custom transition implementations are outside the supported notification contract. */
  TransitionComponent?: never;
  TransitionProps?: never;
}
export interface OptionsObject extends SharedProps {
  key?: SnackbarKey;
}
export interface EnqueueSnackbar {
  (message: SnackbarMessage, options?: OptionsObject): SnackbarKey;
  (options: OptionsObject & { message: SnackbarMessage }): SnackbarKey;
}
export interface ProviderContext {
  enqueueSnackbar: EnqueueSnackbar;
  closeSnackbar(key?: SnackbarKey): void;
}
export interface CustomContentProps extends SharedProps {
  id: SnackbarKey;
  message: SnackbarMessage;
  variant: VariantType;
}
export interface SnackbarProviderProps extends SharedProps {
  children?: React.ReactNode;
  maxSnack?: number;
  dense?: boolean;
  domRoot?: HTMLElement;
  classes?: Partial<
    Record<
      | "root"
      | "containerRoot"
      | `anchorOrigin${"Top" | "Bottom"}${"Left" | "Center" | "Right"}`
      | `containerAnchorOrigin${"Top" | "Bottom"}${"Left" | "Center" | "Right"}`,
      string
    >
  >;
  Components?: Partial<
    Record<VariantType, React.ElementType<CustomContentProps>>
  >;
}
export class SnackbarProvider
  extends React.Component<SnackbarProviderProps>
  implements ProviderContext
{
  enqueueSnackbar: EnqueueSnackbar;
  closeSnackbar(key?: SnackbarKey): void;
}
export function useSnackbar(): ProviderContext;
export const enqueueSnackbar: EnqueueSnackbar;
export function closeSnackbar(key?: SnackbarKey): void;
export const SnackbarContent: React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
>;
export const MaterialDesignContent: React.ForwardRefExoticComponent<
  CustomContentProps & React.RefAttributes<HTMLDivElement>
>;
