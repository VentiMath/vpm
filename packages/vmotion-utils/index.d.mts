export type EasingFunction = (progress: number) => number;
export type EasingModifier = (easing: EasingFunction) => EasingFunction;
export type BezierDefinition = readonly [number, number, number, number];
export type EasingDefinition =
  | BezierDefinition
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
export type Easing = EasingDefinition | EasingFunction;
export type Direction = "start" | "end";
export type DevMessage = (
  check: boolean,
  message: string,
  errorCode?: string,
) => void;
export interface Point {
  x: number;
  y: number;
}
export interface Axis {
  min: number;
  max: number;
}
export interface Box {
  x: Axis;
  y: Axis;
}
export interface BoundingBox {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
export interface AxisDelta {
  translate: number;
  scale: number;
  origin: number;
  originPoint: number;
}
export interface Delta {
  x: AxisDelta;
  y: AxisDelta;
}
export type TransformPoint = (point: Point) => Point;
export const MotionGlobalConfig: {
  skipAnimations?: boolean;
  instantAnimations?: boolean;
  useManualTiming?: boolean;
  WillChange?: any;
  mix?: <T>(a: T, b: T) => (progress: number) => T;
};
export function addUniqueItem<T>(items: T[], item: T): void;
export function removeItem<T>(items: T[], item: T): void;
export function moveItem<T>(items: T[], from: number, to: number): T[];
export function clamp(min: number, max: number, value: number): number;
export function progress(from: number, to: number, value: number): number;
export function wrap(min: number, max: number, value: number): number;
export function secondsToMilliseconds(seconds: number): number;
export function millisecondsToSeconds(milliseconds: number): number;
export function velocityPerSecond(
  velocity: number,
  frameDuration: number,
): number;
export function isObject(value: unknown): value is object;
export function isNumericalString(value: string): boolean;
export function isZeroValueString(value: string): boolean;
export function memo<T>(callback: () => T): () => T;
export function noop<T>(value: T): T;
export function pipe(...transformers: Function[]): Function;
export class SubscriptionManager<Handler extends (...args: any[]) => void> {
  add(handler: Handler): () => void;
  remove(handler: Handler): void;
  notify(
    a?: Parameters<Handler>[0],
    b?: Parameters<Handler>[1],
    c?: Parameters<Handler>[2],
  ): void;
  getSize(): number;
  clear(): void;
}
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): EasingFunction;
export const easeIn: EasingFunction,
  easeOut: EasingFunction,
  easeInOut: EasingFunction;
export const backIn: EasingFunction,
  backOut: EasingFunction,
  backInOut: EasingFunction;
export const circIn: EasingFunction,
  circOut: EasingFunction,
  circInOut: EasingFunction;
export const anticipate: EasingFunction;
export const reverseEasing: EasingModifier, mirrorEasing: EasingModifier;
export function steps(count: number, direction?: Direction): EasingFunction;
export function isBezierDefinition(
  easing: Easing | Easing[],
): easing is BezierDefinition;
export function isEasingArray(easing: unknown): easing is Easing[];
export function getEasingForSegment(
  easing: Easing | Easing[],
  index: number,
): Easing;
export function easingDefinitionToFunction(easing: Easing): EasingFunction;
export const warning: DevMessage, invariant: DevMessage;
export function warnOnce(
  check: boolean,
  message: string,
  errorCode?: string,
): void;
export function hasWarned(message: string): boolean;
