export interface Easing {
  easeInOut: string;
  easeOut: string;
  easeIn: string;
  sharp: string;
}
export interface Duration {
  shortest: number;
  shorter: number;
  short: number;
  standard: number;
  complex: number;
  enteringScreen: number;
  leavingScreen: number;
}
export interface TransitionOptions {
  duration?: number | string;
  easing?: string;
  delay?: number | string;
}
export interface Transitions {
  easing: Easing;
  duration: Duration;
  create: (
    properties?: string | string[],
    options?: TransitionOptions,
  ) => string;
  getAutoHeightDuration: (height: number) => number;
}
export interface TransitionsOptions {
  easing?: Partial<Easing>;
  duration?: Partial<Duration>;
  create?: Transitions["create"];
  getAutoHeightDuration?: Transitions["getAutoHeightDuration"];
}
export const easing: Easing;
export const duration: Duration;
export default function createTransitions(
  options?: TransitionsOptions,
): Transitions;
