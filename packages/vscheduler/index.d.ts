/** Priorities used by React's cooperative scheduler. */
export type Priority = 1 | 2 | 3 | 4 | 5;
export type Callback = (didTimeout: boolean) => Callback | void | null;
declare const taskBrand: unique symbol;
/** Opaque cancellation handle. Do not inspect or mutate its implementation. */
export interface Task {readonly [taskBrand]: true;}
export const unstable_ImmediatePriority: 1;
export const unstable_UserBlockingPriority: 2;
export const unstable_NormalPriority: 3;
export const unstable_LowPriority: 4;
export const unstable_IdlePriority: 5;
export const unstable_Profiling: null;
export function unstable_now(): number;
export function unstable_scheduleCallback(priority: Priority, callback: Callback, options?: {delay?: number}): Task;
export function unstable_cancelCallback(task: Task | null | undefined): void;
export function unstable_getCurrentPriorityLevel(): Priority;
export function unstable_runWithPriority<T>(priority: Priority, callback: () => T): T;
export function unstable_next<T>(callback: () => T): T;
export function unstable_wrapCallback<F extends (...args: any[]) => any>(callback: F): F;
export function unstable_shouldYield(): boolean;
export function unstable_requestPaint(): void;
export function unstable_forceFrameRate(fps: number): void;
declare const api: {
  unstable_ImmediatePriority: typeof unstable_ImmediatePriority;
  unstable_UserBlockingPriority: typeof unstable_UserBlockingPriority;
  unstable_NormalPriority: typeof unstable_NormalPriority;
  unstable_LowPriority: typeof unstable_LowPriority;
  unstable_IdlePriority: typeof unstable_IdlePriority;
  unstable_Profiling: null;
  unstable_now: typeof unstable_now;
  unstable_scheduleCallback: typeof unstable_scheduleCallback;
  unstable_cancelCallback: typeof unstable_cancelCallback;
  unstable_getCurrentPriorityLevel: typeof unstable_getCurrentPriorityLevel;
  unstable_runWithPriority: typeof unstable_runWithPriority;
  unstable_next: typeof unstable_next;
  unstable_wrapCallback: typeof unstable_wrapCallback;
  unstable_shouldYield: typeof unstable_shouldYield;
  unstable_requestPaint: typeof unstable_requestPaint;
  unstable_forceFrameRate: typeof unstable_forceFrameRate;
};
export default api;
