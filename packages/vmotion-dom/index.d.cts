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

export interface FrameData {
  delta: number;
  timestamp: number;
  isProcessing: boolean;
}
export type Process = (data: FrameData) => void;
export type Schedule = (
  process: Process,
  keepAlive?: boolean,
  immediate?: boolean,
) => Process;
export type StepId =
  | "setup"
  | "read"
  | "resolveKeyframes"
  | "preUpdate"
  | "update"
  | "preRender"
  | "render"
  | "postRender";
export interface Step {
  schedule: Schedule;
  cancel(process: Process): void;
  process(data: FrameData): void;
}
export type Batcher = Record<StepId, Schedule>;
export type Steps = Record<StepId, Step>;
export interface RenderBatcher {
  schedule: Batcher;
  cancel(process: Process): void;
  state: FrameData;
  steps: Steps;
}
export declare function createRenderBatcher(
  request: (callback: () => void) => void,
  allowKeepAlive: boolean,
  state?: FrameData,
): RenderBatcher;
export declare const frame: Batcher;
export declare const frameData: FrameData;
export declare const frameSteps: Steps;
export declare function cancelFrame(process: Process): void;
export declare function processFrame(timestamp?: number): void;
export declare const microtask: Batcher;
export declare function cancelMicrotask(process: Process): void;
export declare const time: { now(): number; set(timestamp: number): void };
export interface MotionValueEventCallbacks<V> {
  change: (value: V) => void;
  animationStart: () => void;
  animationComplete: () => void;
  animationCancel: () => void;
  destroy: () => void;
}
export interface Owner {
  current: unknown;
  getProps(): object;
}
export interface MotionValueOptions {
  owner?: Owner;
}
export interface MotionValueAnimation<V = unknown> {
  stop(): void;
  state?: string;
  finished?: Promise<void>;
  liveValue?: () => V | undefined;
}
export type Subscriber<V> = (value: V) => void;
export type PassiveEffect<V> = (value: V, setter: (value: V) => void) => void;
export type StartAnimation<V = unknown> = (
  complete: () => void,
) => MotionValueAnimation<V> | undefined;
export declare class MotionValue<V = unknown> {
  constructor(initial: V, options?: MotionValueOptions);
  owner?: Owner;
  animation?: MotionValueAnimation<V>;
  hasAnimated: boolean;
  updatedAt: number;
  prevUpdatedAt?: number;
  isEffectActive?: boolean;
  liveStyle?: boolean;
  get(): V;
  getCurrent(): V;
  getPrevious(): V | undefined;
  getVelocity(): number;
  set(value: V): void;
  setCurrent(value: V): void;
  setPrevFrameValue(value?: V): void;
  setWithVelocity(previous: V, value: V, delta: number): void;
  jump(value: V, endAnimation?: boolean): void;
  on<E extends keyof MotionValueEventCallbacks<V>>(
    name: E,
    callback: MotionValueEventCallbacks<V>[E],
  ): () => void;
  onChange(callback: Subscriber<V>): () => void;
  clearListeners(): void;
  attach(effect: PassiveEffect<V>, stop: () => void): void;
  dirty(): void;
  addDependent(value: { dirty(): void }): void;
  removeDependent(value: { dirty(): void }): void;
  updateAndNotify: (value: V) => void;
  start(factory: StartAnimation<V>): Promise<void>;
  stop(): void;
  isAnimating(): boolean;
  destroy(): void;
}
export declare function motionValue<V>(
  initial: V,
  options?: MotionValueOptions,
): MotionValue<V>;
export declare function isMotionValue(
  value: unknown,
): value is MotionValue<unknown>;
export declare const collectMotionValues: {
  current: MotionValue<any>[] | undefined;
};
