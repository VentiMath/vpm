export type Unit =
  | "millisecond"
  | "milliseconds"
  | "ms"
  | "second"
  | "seconds"
  | "s"
  | "minute"
  | "minutes"
  | "m"
  | "hour"
  | "hours"
  | "h"
  | "day"
  | "days"
  | "d"
  | "week"
  | "weeks"
  | "w";
export type MomentInput = Moment | Date | string | number | null | undefined;
export interface Moment {
  readonly _isAMomentObject: true;
  valueOf(): number;
  isValid(): boolean;
  toDate(): Date;
  toISOString(): string | null;
  toJSON(): string | null;
  clone(): Moment;
  add(amount: number, unit?: Unit): this;
  diff(other: MomentInput, unit?: Unit, asFloat?: boolean): number;
}
export interface Duration {
  isValid(): boolean;
  asMilliseconds(): number;
  asSeconds(): number;
  asMinutes(): number;
  asHours(): number;
  asDays(): number;
  asWeeks(): number;
  milliseconds(): number;
  seconds(): number;
  minutes(): number;
  hours(): number;
}
export interface MomentFactory {
  (input?: MomentInput): Moment;
  now: () => number;
  isMoment(value: unknown): value is Moment;
  duration(amount: number, unit?: Unit): Duration;
  readonly fn: Moment;
}
declare const moment: MomentFactory;
export default moment;
export const isMoment: MomentFactory["isMoment"];
export const duration: MomentFactory["duration"];
