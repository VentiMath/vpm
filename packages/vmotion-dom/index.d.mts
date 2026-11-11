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
export interface RGBA {
  red: number;
  green: number;
  blue: number;
  alpha?: number;
}
export interface HSLA {
  hue: number;
  saturation: number;
  lightness: number;
  alpha?: number;
}
export type Color = RGBA | HSLA;
export type MixScalar = number | string | Color;
export type Mixable = MixScalar | MixScalar[] | Record<string, MixScalar>;
export type Mixed<T> = T extends number
  ? number
  : T extends string
    ? string
    : T extends Color
      ? Color | string
      : T extends MixScalar[]
        ? (number | string | Color)[]
        : {
            [K in keyof T]: T[K] extends number
              ? number
              : T[K] extends string
                ? string
                : Color | string;
          };
export declare function interpolate<T extends Mixable>(
  input: number[],
  output: T[],
  options?: Omit<InterpolateOptions<T>, "mixer">,
): (value: number) => Mixed<T>;
export declare function mix(from: number, to: number, progress: number): number;
export declare function mix<T extends Mixable>(
  from: T,
  to: T,
): (progress: number) => Mixed<T>;
export declare function mixColor(
  from: string | Color,
  to: string | Color,
): (progress: number) => string;
export declare function mixLinearColor(
  from: number,
  to: number,
  progress: number,
): number;
export declare function mixComplex(
  from: string,
  to: string,
): (progress: number) => string;
export declare function mixArray(
  from: MixScalar[],
  to: MixScalar[],
): (progress: number) => MixScalar[];
export declare function mixObject<
  T extends Record<string, MixScalar>,
  U extends Record<string, MixScalar>,
>(from: T, to: U): (progress: number) => Mixed<T & U>;
export declare function mixImmediate<T>(
  from: T,
  to: T,
): (progress: number) => T;
export declare function mixVisibility<T extends string>(
  from: T,
  to: T,
): (progress: number) => T;
export declare function getMixer(
  value: Mixable,
): (from: Mixable, to: Mixable) => (progress: number) => Mixable;
export declare const invisibleValues: Set<string>;
export declare function parseHex(value: string): RGBA;
export declare function hslaToRgba(value: HSLA): RGBA;
export interface ColorType<T extends Color> {
  test(value: unknown): boolean;
  parse(value: string | Color): T;
  transform(value: T): string;
}
export declare const rgba: ColorType<RGBA>;
export declare const hsla: ColorType<HSLA>;
export declare const hex: ColorType<RGBA>;
export declare const color: Omit<ColorType<Color>, "transform"> & {
  transform(value: Color | string): string;
  getAnimatableNone(value: Color | string): string;
};
export declare const rgbUnit: {
  test(value: unknown): boolean;
  parse(value: string): number;
  transform(value: number): number;
};
export interface ComplexValueInfo {
  values: (number | string | Color)[];
  split: string[];
  indexes: { color: number[]; number: number[]; var: number[] };
  types: ("color" | "number" | "var")[];
}
export declare function analyseComplexValue(
  value: string | number,
): ComplexValueInfo;
export declare function parseComplexValue(
  value: string | number,
): ComplexValueInfo["values"];
export declare function buildTransformer(
  info: Pick<ComplexValueInfo, "split" | "types">,
): (values: ComplexValueInfo["values"]) => string;
export declare function createTransformer(
  value: string | number,
): (values: ComplexValueInfo["values"]) => string;
export declare function hasComplexValues(value: unknown): boolean;
export declare const complex: {
  test(value: unknown): boolean;
  parse: typeof parseComplexValue;
  createTransformer: typeof createTransformer;
  getAnimatableNone(value: string | number): string;
};

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
  test(subject: unknown): subject is object;
  read(subject: object, key: string, keyframes?: number | string | (number | string | null)[]): number | string | undefined;
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
export type KeyframeResolverConstructor = new (
  ...args: ConstructorParameters<typeof KeyframeResolver<any>>
) => KeyframeResolver<any>;
export interface AnimationElement
  extends Omit<ResolverElement, "current">,
    Owner {
  KeyframeResolver?: KeyframeResolverConstructor;
  shouldSkipAnimations?: boolean;
  shouldReduceMotion?: boolean | null;
}
export declare function animateMotionValue<V extends number | string>(
  name: string,
  value: MotionValue<V>,
  target: V | (V | null)[],
  transition: ElementTransition | undefined,
  element: AnimationElement,
  isHandoff?: boolean,
): (complete: () => void) => ElementAnimation;
export declare function animateMotionValue(
  name: string,
  value: MotionValue<number>,
  target: number | (number | null)[],
  transition: NumericTransition | undefined,
  element: undefined,
  isHandoff: true,
): (complete: () => void) => ElementAnimation;
export declare function getDefaultTransition(
  name: string,
  options: { keyframes: (number | null)[] },
): Partial<NumericValueTransition>;
export declare function getValueTransition(
  transition: NumericTransition,
  key: string,
): NumericValueTransition;
export declare function isTransitionDefined(transition: object): boolean;

export declare function defaultTransformValue(name: string): number;
export declare function parseValueFromTransform(
  transform: string | undefined,
  name: string,
): number;
export declare function readTransformValue(
  element: HTMLElement | SVGElement,
  name: string,
): number;
export declare function getComputedStyle(
  element: HTMLElement | SVGElement,
  name: string,
): string;
export declare function readStyleValue(
  element: HTMLElement | SVGElement,
  name: string,
): string | number;
export declare function readSVGValue(
  element: SVGElement,
  name: string,
): string | number | undefined;
export declare function getVariableValue(
  token: string,
  element: Element,
  depth?: number,
): string | number | undefined;
export declare function fillWildcards(frames: (string | number | null)[]): void;
export declare function applyPxDefaults(
  frames: (string | number | null)[],
  name: string,
): void;
export interface ResolverElement {
  KeyframeResolver?: KeyframeResolverConstructor;
  current?: HTMLElement | SVGElement;
  readValue?: (
    name: string,
    keyframe: string | number | null,
  ) => string | number | undefined;
  render?: () => void;
  getValue?: (name: string) => MotionValue<any> | undefined;
  measureViewportBox?: () => {
    x: { min: number; max: number };
    y: { min: number; max: number };
  };
}
export declare class KeyframeResolver<
  T extends string | number = string | number,
> {
  constructor(
    keyframes: (T | null)[],
    complete: (
      keyframes: T[],
      finalKeyframe: T | undefined,
      forced: boolean,
    ) => void,
    name?: string,
    value?: MotionValue<T>,
    element?: ResolverElement,
    isAsync?: boolean,
  );
  protected unresolvedKeyframes: (T | null)[];
  protected motionValue?: MotionValue<T>;
  protected isAsync: boolean;
  name?: string;
  element?: ResolverElement;
  finalKeyframe?: T;
  state: "pending" | "scheduled" | "complete";
  needsMeasurement: boolean;
  scheduleResolve(): void;
  readKeyframes(): void;
  setFinalKeyframe(): void;
  measureInitialState(): void;
  renderEndStyles(): void;
  measureEndState(): void;
  complete(forced?: boolean): void;
  cancel(): void;
  resume(): void;
}
export declare class DOMKeyframesResolver<
  T extends string | number = string | number,
> extends KeyframeResolver<T> {
  resolveNoneKeyframes(): void;
}
export declare function flushKeyframeResolvers(): void;

export type SingleValueAnimation<T extends number | string = number> = Omit<JSAnimation, "finished" | "sample" | "sampleAt" | "tick"> & {
  readonly finished: Promise<void>;
  sample(milliseconds: number): { done: boolean; value: T };
  sampleAt(timestamp: number, resolved?: boolean): T;
  tick(timestamp: number): { done: boolean; value: T };
};
export interface StringValueTransition extends Omit<NumericValueTransition, "from" | "onUpdate" | "finalKeyframe"> {
  from?: number | string;
  onUpdate?: (value: string) => void;
  finalKeyframe?: never;
}
export declare function animateSingleValue(
  value: number | MotionValue<number>, target: number | (number | null)[], options?: NumericValueTransition,
): SingleValueAnimation<number>;
export declare function animateSingleValue(
  value: string | MotionValue<string>, target: string | (string | null)[], options?: StringValueTransition,
): SingleValueAnimation<string>;
export declare function animateSingleValue(
  value: number | string | MotionValue<number> | MotionValue<string> | MotionValue<number | string>,
  target: number | string | (number | string | null)[],
  options?: Omit<StringValueTransition, "onUpdate"> & { onUpdate?: (value: number | string) => void },
): SingleValueAnimation<number | string>;

/** Numeric values, matching CSS units, variables and two-frame measured lengths. */
export type ElementKeyframes = Record<
  string,
  number | string | (number | string | null)[] | undefined
>;
export interface ElementValueTransition
  extends Omit<NumericValueTransition, "from" | "onUpdate"> {
  from?: number | string;
  onUpdate?: (value: number | string) => void;
}
export type ElementTransition = ElementValueTransition & {
  default?: ElementValueTransition;
  skipAnimations?: boolean;
  reduceMotion?: boolean;
  [property: string]: unknown;
};
export interface ElementAnimation extends PromiseLike<void> {
  readonly startTime: number | null;
  readonly finished: Promise<void>;
  readonly duration: number;
  readonly iterationDuration: number;
  readonly state: string;
  time: number;
  speed: number;
  play(): void;
  pause(): void;
  stop(): void;
  cancel(): void;
  complete(): void;
}
/** Renderer destination for transferred values; the full VisualElement is not implemented. */
export interface ElementRenderer extends AnimationElement {
  current: HTMLElement | SVGElement;
  getValue(key: string): MotionValue<any> | undefined;
  addValue(key: string, value: MotionValue<any>): void;
  removeValue(key: string): void;
  readValue?(
    key: string,
    target: string | number | null,
  ): number | string | undefined;
  shouldSkipAnimations?: boolean;
  shouldReduceMotion?: boolean | null;
}
export declare function handOffElementState(
  element: HTMLElement | SVGElement,
  renderer: ElementRenderer,
): void;
export declare function animateElement(
  element: HTMLElement | SVGElement,
  keyframes: ElementKeyframes,
  transition?: ElementTransition,
  renderer?: ElementRenderer,
): ElementAnimation[];
export declare function animateValues(
  getValue: (key: string) => MotionValue<any>,
  keyframes: ElementKeyframes,
  transition?: ElementTransition,
  element?: ResolverElement,
): ElementAnimation[];

/** Renderer targets support numeric, unit, color and complex values; variant propagation is not implemented. */
export type TargetAndTransition = {
  transition?: ElementTransition;
  transitionEnd?: Record<string, string | number | undefined>;
  [property: string]: unknown;
};
export interface TargetRenderer extends ResolverElement {
  latestValues?: Record<string, string | number | undefined>;
  getValue(key: string): MotionValue<any> | undefined;
  addValue(key: string, value: MotionValue<any>): void;
  getDefaultTransition?(): ElementTransition | undefined;
  shouldSkipAnimations?: boolean;
  shouldReduceMotion?: boolean | null;
}
export declare function animateTarget(
  renderer: TargetRenderer,
  target: TargetAndTransition,
  options?: { delay?: number; transitionOverride?: ElementTransition },
): ElementAnimation[];
export interface GroupMember {
  time: number;
  speed: number;
  readonly state: string;
  readonly startTime?: number | null;
  readonly duration: number;
  readonly iterationDuration: number;
  readonly finished: Promise<unknown>;
  play(): void;
  pause(): void;
  stop(): void;
  cancel(): void;
  complete(): void;
  attachTimeline?(timeline: GroupTimeline): () => void;
}
export interface GroupTimeline {
  observe(animation: GroupMember): () => void;
}
export declare class GroupAnimation {
  animations: GroupMember[];
  constructor(animations: (GroupMember | undefined)[]);
  readonly finished: Promise<unknown[]>;
  readonly duration: number;
  readonly iterationDuration: number;
  readonly state: string;
  readonly startTime: number | null;
  time: number;
  speed: number;
  play(): void;
  pause(): void;
  stop: () => void;
  cancel(): void;
  complete(): void;
  attachTimeline(timeline: GroupTimeline): () => void;
}
export declare class GroupAnimationWithThen extends GroupAnimation {
  then(
    onResolve: () => void,
    onReject?: (reason: unknown) => void,
  ): Promise<void>;
}

/** Builds a neutral color/complex/filter/transform value; URL filters remain discrete. */
export declare function getAnimatableNone(key: string, value: string): string;

/** Element selectors and explicitly registered object subjects. Sequence timelines are not implemented. */
export interface AnimationScope {
  readonly current: ParentNode | null;
  animations: GroupAnimationWithThen[];
  reduceMotion?: boolean;
  skipAnimations?: boolean;
}
export type SelectorTransition = Omit<ElementValueTransition, "delay"> & {
  default?: ElementValueTransition;
  skipAnimations?: boolean;
  reduceMotion?: boolean;
  [property: string]: unknown;
  delay?: number | ((index: number, total: number) => number);
};
export interface ScopedAnimate {
  (subject: string | MotionValue<string>, keyframes: string | (string | null)[], options?: StringValueTransition): GroupAnimationWithThen;
  (subject: object | object[], keyframes: ElementKeyframes, options?: SelectorTransition): GroupAnimationWithThen;
  (subject: number | MotionValue<number>, keyframes: number | (number | null)[], options?: NumericValueTransition): GroupAnimationWithThen;
  (subject: Element | Iterable<Element> | ArrayLike<Element> | string | null | undefined, keyframes: ElementKeyframes, options?: SelectorTransition): GroupAnimationWithThen;
}
export declare function createScopedAnimate(options?: {
  scope?: AnimationScope;
  reduceMotion?: boolean;
  skipAnimations?: boolean;
}): ScopedAnimate;
export declare const animate: ScopedAnimate & { addEffect: typeof addEffect; removeEffect: typeof removeEffect };
export declare function animateElements(
  subject: Element | Iterable<Element> | ArrayLike<Element> | string | null | undefined,
  keyframes: ElementKeyframes,
  options?: SelectorTransition,
  scope?: Pick<AnimationScope, "current">,
): ElementAnimation[];

/** Per-subject subscriptions and deferred writes for custom renderers. */
export declare class MotionValueState implements EffectBindingState {
  constructor(step?: Schedule);
  set(key: string, value: MotionValue<any>, render?: () => void, computed?: MotionValue<any>): () => void;
  get(key: string): MotionValue<any> | undefined;
  flush: () => void;
  release(): Map<string, MotionValue<any>>;
}
export type EffectTest<Subject extends object> = (subject: unknown) => subject is Subject;
export type EffectRead<Subject extends object> = (subject: Subject, key: string, keyframes?: number | string | (number | string | null)[]) => number | string | undefined;
export interface EffectOptions<Subject extends object> {
  test?: EffectTest<Subject>;
  read?: EffectRead<Subject>;
  step?: Schedule;
}
export interface Effect<Subject extends object = object> extends EffectOptions<Subject> {
  (subject: Subject, values: Record<string, MotionValue<any>>): () => void;
  get(subject: Subject, key: string): MotionValue<any> | undefined;
  state(subject: Subject): MotionValueState | undefined;
  flush(subject: Subject): void;
}
export interface AnimateEffect<Subject extends object = object> extends Effect<Subject> {
  test: EffectTest<Subject>;
  read: EffectRead<Subject>;
}
export type AddEffectValue<Subject extends object> = (subject: Subject, state: MotionValueState, key: string, value: MotionValue<any>) => () => void;
export declare function createEffect<Subject extends object>(addValue: AddEffectValue<Subject>, options: EffectOptions<Subject> & { test: EffectTest<Subject>; read: EffectRead<Subject> }): AnimateEffect<Subject>;
export declare function createEffect<Subject extends object>(addValue: AddEffectValue<Subject>, options?: EffectOptions<Subject>): Effect<Subject>;
export declare function addEffect(effect: AnimateEffect<any> | PropertyEffect): void;
export declare function removeEffect(effect: AnimateEffect<any> | PropertyEffect): void;
export declare function findEffect(subject: unknown): AnimateEffect | PropertyEffect | undefined;
export interface EffectKeyframes {
  [key: string]: number | string | (number | string | null)[] | ElementTransition | undefined;
  transition?: ElementTransition;
  /** Custom effect transitionEnd is not implemented yet. */
  transitionEnd?: never;
}
export type EffectTransition = ElementTransition;
export declare function animateEffectSubject<Subject extends object>(effect: AnimateEffect<Subject> | PropertyEffect, subject: Subject, keyframes: EffectKeyframes, transition?: EffectTransition, element?: AnimationElement): ElementAnimation[];
