export type EasingFunction = (progress: number) => number;
export type MixerFactory<T> = (from: T, to: T) => (progress: number) => T;
export interface InterpolateOptions<T> {
  clamp?: boolean;
  ease?: EasingFunction | (EasingFunction | undefined)[];
  mixer?: MixerFactory<T>;
}
export declare function interpolate(
  input: number[],
  output: number[],
  options?: InterpolateOptions<number>,
): (value: number) => number;
export declare function interpolate<T>(
  input: number[],
  output: T[],
  options: InterpolateOptions<T> & { mixer: MixerFactory<T> },
): (value: number) => T;
export declare function mixNumber(
  from: number,
  to: number,
  progress: number,
): number;
export type StaggerOrigin = "first" | "last" | "center" | "edges" | number;
export type Easing =
  | EasingFunction
  | [number, number, number, number]
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "backIn"
  | "backOut"
  | "backInOut"
  | "circIn"
  | "circOut"
  | "circInOut"
  | "anticipate";
export interface StaggerOptions {
  startDelay?: number;
  from?: StaggerOrigin;
  ease?: Easing;
}
export declare function stagger(
  duration?: number,
  options?: StaggerOptions,
): (index: number, total: number) => number;
