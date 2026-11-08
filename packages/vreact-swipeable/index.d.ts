import type * as React from "react";
export declare const LEFT: "Left", RIGHT: "Right", UP: "Up", DOWN: "Down";
export type SwipeDirections =
  | typeof LEFT
  | typeof RIGHT
  | typeof UP
  | typeof DOWN;
export type HandledEvents = React.MouseEvent | MouseEvent | TouchEvent;
export type Vector2 = [number, number];
export interface SwipeEventData {
  absX: number;
  absY: number;
  deltaX: number;
  deltaY: number;
  dir: SwipeDirections;
  event: HandledEvents;
  first: boolean;
  initial: Vector2;
  velocity: number;
  vxvy: Vector2;
}
export type SwipeCallback = (data: SwipeEventData) => void;
export type TapCallback = (data: { event: HandledEvents }) => void;
export type SwipeableDirectionCallbacks = {
  onSwipedLeft: SwipeCallback;
  onSwipedRight: SwipeCallback;
  onSwipedUp: SwipeCallback;
  onSwipedDown: SwipeCallback;
};
export type SwipeableCallbacks = SwipeableDirectionCallbacks & {
  onSwipeStart: SwipeCallback;
  onSwiping: SwipeCallback;
  onSwiped: SwipeCallback;
  onTap: TapCallback;
  onTouchStartOrOnMouseDown: TapCallback;
  onTouchEndOrOnMouseUp: TapCallback;
};
export type ConfigurationOptionDelta =
  | number
  | Partial<Record<Lowercase<SwipeDirections>, number>>;
export interface ConfigurationOptions {
  delta: ConfigurationOptionDelta;
  preventScrollOnSwipe: boolean;
  rotationAngle: number;
  trackMouse: boolean;
  trackTouch: boolean;
  swipeDuration: number;
  touchEventOptions: { passive: boolean };
}
export type SwipeableProps = Partial<SwipeableCallbacks & ConfigurationOptions>;
export type SwipeablePropsWithDefaultOptions = Partial<SwipeableCallbacks> &
  ConfigurationOptions;
export interface SwipeableHandlers {
  ref(element: HTMLElement | null): void;
  onMouseDown?(event: React.MouseEvent): void;
}
export declare function useSwipeable(
  options?: SwipeableProps,
): SwipeableHandlers;
