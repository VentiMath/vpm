import * as React from "react";
import {
  Transition,
  CSSTransition,
  TransitionGroup,
  config,
} from "vreact-transition-group";
import Sub from "vreact-transition-group/Transition";
import type {
  TransitionProps,
  TransitionActions,
} from "vreact-transition-group/Transition";
import type { CSSTransitionProps } from "vreact-transition-group/CSSTransition";
const ref = React.createRef<HTMLDivElement>();
const explicit: TransitionProps<HTMLDivElement> = {
  nodeRef: ref,
  onEnter: (appearing: boolean) => void appearing,
  addEndListener: (done) => done(),
};
const wrapper: TransitionProps = {
  onEnter: (node, appearing) => {
    node.focus();
    void appearing;
  },
};
const classes: CSSTransitionProps<HTMLDivElement> = {
  nodeRef: ref,
  classNames: { enter: "base", enterActive: "active" },
};
const actions: TransitionActions = { appear: true };
export const demo = (
  <TransitionGroup component={null} {...actions}>
    <Transition {...explicit} nodeRef={ref} timeout={{ enter: 10, exit: 20 }}>
      {(status, props) => (
        <div {...props} ref={ref}>
          {status}
        </div>
      )}
    </Transition>
    <CSSTransition {...classes} nodeRef={ref}>
      <div ref={ref} />
    </CSSTransition>
    <Sub nodeRef={ref}>
      <div ref={ref} />
    </Sub>
  </TransitionGroup>
);
config.disabled = false;
void wrapper;
// @ts-expect-error Live component props require a nodeRef.
const missingRef: React.ComponentProps<typeof Transition> = {
  in: true,
  timeout: 0,
};
// @ts-expect-error Explicit-ref callbacks receive a boolean.
const wrongCallback: import("vreact-transition-group").EnterHandler<
  HTMLDivElement
> = (node: HTMLElement) => node.focus();
// @ts-expect-error Only documented CSS phase keys are accepted.
const wrongPhase: keyof import("vreact-transition-group").CSSTransitionClassNames =
  "entered";
