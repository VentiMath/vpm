import * as React from "react";
export type TransitionStatus =
  | "unmounted"
  | "exited"
  | "entering"
  | "entered"
  | "exiting";
export interface TransitionActions {
  appear?: boolean;
  enter?: boolean;
  exit?: boolean;
}
export type EnterHandler<T extends Element | undefined = undefined> =
  T extends undefined
    ? (node: HTMLElement, isAppearing: boolean) => void
    : (isAppearing: boolean) => void;
export type ExitHandler<T extends Element | undefined = undefined> =
  T extends undefined ? (node: HTMLElement) => void : () => void;
export type EndHandler<T extends Element | undefined = undefined> =
  T extends undefined
    ? (node: HTMLElement, done: () => void) => void
    : (done: () => void) => void;
/** Default callback types describe wrappers such as MUI; live VPM transitions require an explicit ref. */
export interface TransitionProps<T extends Element | undefined = undefined>
  extends TransitionActions,
    Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  in?: boolean;
  mountOnEnter?: boolean;
  unmountOnExit?: boolean;
  nodeRef?: React.RefObject<T | null>;
  timeout?: number | { appear?: number; enter?: number; exit?: number } | null;
  addEndListener?: EndHandler<T>;
  onEnter?: EnterHandler<T>;
  onEntering?: EnterHandler<T>;
  onEntered?: EnterHandler<T>;
  onExit?: ExitHandler<T>;
  onExiting?: ExitHandler<T>;
  onExited?: ExitHandler<T>;
  children?:
    | React.ReactElement
    | ((
        status: TransitionStatus,
        childProps: Record<string, unknown>,
      ) => React.ReactNode);
}
export interface CSSTransitionClassNames {
  appear?: string;
  appearActive?: string;
  appearDone?: string;
  enter?: string;
  enterActive?: string;
  enterDone?: string;
  exit?: string;
  exitActive?: string;
  exitDone?: string;
}
export interface CSSTransitionProps<T extends Element | undefined = undefined>
  extends TransitionProps<T> {
  classNames?: string | CSSTransitionClassNames;
}
export class Transition<
  T extends Element = HTMLElement,
> extends React.Component<
  TransitionProps<Element> & { nodeRef: React.RefObject<T | null> }
> {}
export class CSSTransition<
  T extends Element = HTMLElement,
> extends React.Component<
  CSSTransitionProps<Element> & { nodeRef: React.RefObject<T | null> }
> {}
export interface TransitionGroupProps
  extends React.HTMLAttributes<HTMLElement>,
    TransitionActions {
  component?: React.ElementType | null;
  childFactory?: (child: React.ReactElement<any>) => React.ReactElement;
}
export class TransitionGroup extends React.Component<TransitionGroupProps> {}
export const config: { disabled: boolean };
