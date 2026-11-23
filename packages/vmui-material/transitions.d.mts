import type * as React from "react";

export type TransitionStatus = "unmounted" | "exited" | "entering" | "entered" | "exiting";
export type EnterHandler = (node: HTMLElement, isAppearing: boolean) => void;
export type ExitHandler = (node: HTMLElement) => void;
export interface TransitionActions { appear?: boolean; enter?: boolean; exit?: boolean }
export interface EasingProps { easing: string | { enter?: string; exit?: string } }
export type TransitionHandlerKeys = "onEnter" | "onEntering" | "onEntered" | "onExit" | "onExiting" | "onExited";
export type TransitionHandlerProps = {
  [K in TransitionHandlerKeys]?: K extends "onEnter" | "onEntering" | "onEntered" ? EnterHandler : ExitHandler;
};
export type TransitionKeys = TransitionHandlerKeys | "in" | "mountOnEnter" | "unmountOnExit" | "timeout" | "easing" | "addEndListener" | "disablePrefersReducedMotion";
/** Props exchanged by picker modal/popover transition slots. */
export interface TransitionProps extends React.HTMLAttributes<HTMLElement>, TransitionActions, TransitionHandlerProps {
  in?: boolean;
  mountOnEnter?: boolean;
  unmountOnExit?: boolean;
  timeout?: number | { appear?: number; enter?: number; exit?: number };
  easing?: EasingProps["easing"];
  addEndListener?: (node: HTMLElement, done: () => void) => void;
  disablePrefersReducedMotion?: boolean;
}
