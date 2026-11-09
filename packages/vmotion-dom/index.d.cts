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

/** Low-level generator and playback timings use milliseconds. Control.time uses seconds. */
export interface NumericKeyframeOptions {
  keyframes: number[];
  duration?: number;
  times?: number[];
  ease?: Easing | Easing[];
}
export interface NumericAnimationState {
  value: number;
  done: boolean;
}
export interface KeyframeGenerator {
  calculatedDuration: number;
  next(milliseconds: number): NumericAnimationState;
}
export interface AnimationDriverControls {
  now(): number;
  start(): void;
  stop(): void;
}
export interface NumericAnimationOptions extends NumericKeyframeOptions {
  type?: "keyframes" | "tween" | "spring" | typeof spring | false;
  stiffness?: number;
  damping?: number;
  mass?: number;
  velocity?: number;
  restDelta?: number;
  restSpeed?: number;
  bounce?: number;
  visualDuration?: number;
  delay?: number;
  repeat?: number;
  repeatDelay?: number;
  repeatType?: "loop" | "reverse" | "mirror";
  autoplay?: boolean;
  finalKeyframe?: number;
  driver?: (update: (timestamp: number) => void) => AnimationDriverControls;
  onUpdate?: (value: number) => void;
  onPlay?: () => void;
  onComplete?: () => void;
  onStop?: () => void;
}
export declare function keyframes(
  options: NumericKeyframeOptions,
): KeyframeGenerator;
export declare class JSAnimation implements MotionValueAnimation<number> {
  constructor(options: NumericAnimationOptions);
  state: "idle" | "running" | "paused" | "finished";
  startTime: number | null;
  readonly duration: number;
  readonly iterationDuration: number;
  time: number;
  speed: number;
  finished: Promise<void>;
  then<T = void, U = never>(
    resolve?: ((value: void) => T | PromiseLike<T>) | null,
    reject?: ((reason: any) => U | PromiseLike<U>) | null,
  ): Promise<T | U>;
  play(): void;
  pause(): void;
  stop: () => void;
  complete(): void;
  cancel(): void;
  at(timestamp: number): number;
  sampleAt(timestamp: number, resolved?: boolean): number;
  sample(milliseconds: number): NumericAnimationState;
  tick(timestamp: number): NumericAnimationState;
}
export declare function animateValue(
  options: NumericAnimationOptions,
): JSAnimation;

export interface SpringOptions {
  keyframes?: number[];
  stiffness?: number;
  damping?: number;
  mass?: number;
  velocity?: number;
  restDelta?: number;
  restSpeed?: number;
  /** Milliseconds, bounded to 10–10000 for duration-calibrated springs. */
  duration?: number;
  /** Seconds; overrides duration when physics coefficients are absent. */
  visualDuration?: number;
  bounce?: number;
}
export interface SpringGenerator {
  calculatedDuration: number | null;
  next(milliseconds: number): NumericAnimationState;
  velocity(milliseconds: number): number;
  retarget(keyframes: number[], velocity?: number): void;
}
export declare function spring(
  options?: SpringOptions | number,
  bounce?: number,
): SpringGenerator;
export declare function calcGeneratorDuration(
  generator: { next(milliseconds: number): NumericAnimationState },
  timeStep?: number,
  maxDuration?: number,
): number;
export declare const maxGeneratorDuration: 20000;

/** DOM bindings are deferred to the render phase; cleanup leaves the last paint. */
export type ElementOrSelector =
  | Element
  | readonly Element[]
  | NodeListOf<Element>
  | string
  | null
  | undefined;
export interface EffectBindingState {
  get(key: string): MotionValue<any> | undefined;
  flush(): void;
  release(): Map<string, MotionValue<any>>;
}
export interface DOMEffect {
  (
    subject: ElementOrSelector,
    values: Record<string, MotionValue<any>>,
  ): () => void;
  get(subject: ElementOrSelector, key: string): MotionValue<any> | undefined;
  flush(subject: Element): void;
  state(subject: Element): EffectBindingState | undefined;
}
export interface PropertyEffect {
  (subject: object, values: Record<string, MotionValue<any>>): () => void;
  get(subject: object, key: string): MotionValue<any> | undefined;
  flush(subject: object): void;
  state(subject: object): EffectBindingState | undefined;
}
export declare const styleEffect: DOMEffect;
export declare const styleSubjectEffect: DOMEffect;
export declare const attrEffect: DOMEffect;
export declare const svgEffect: DOMEffect;
export declare const svgSubjectEffect: DOMEffect;
export declare const propEffect: PropertyEffect;
export declare function releaseElement(
  element: Element,
): Map<string, MotionValue<any>> | undefined;
export declare function resolveElements(
  subject: ElementOrSelector,
  scope?: { readonly current: ParentNode | null },
  selectorCache?: Record<string, NodeListOf<Element>>,
): Element[];

/** Public transition timings use seconds; elapsed alone uses milliseconds. */
export interface NumericValueTransition
  extends Omit<NumericAnimationOptions, "keyframes"> {
  from?: number;
  elapsed?: number;
}
export type NumericTransition = NumericValueTransition & {
  default?: NumericValueTransition;
  [property: string]: unknown;
};
export declare function animateMotionValue(
  name: string,
  value: MotionValue<number>,
  target: number | (number | null)[],
  transition?: NumericTransition,
): (complete: () => void) => JSAnimation;
export declare function getDefaultTransition(
  name: string,
  options: { keyframes: (number | null)[] },
): Partial<NumericValueTransition>;
export declare function getValueTransition(
  transition: NumericTransition,
  key: string,
): NumericValueTransition;
export declare function isTransitionDefined(transition: object): boolean;
