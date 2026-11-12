/** Plain Date inputs and the en-US application surface. Date subclasses and context options are outside this package's scope. */
export type DateArg = Date | number | string;
export type LocaleWidth = "short" | "medium" | "long" | "full";
export interface Locale {
  code: "en-US";
  formatLong: {
    date(options?: { width?: LocaleWidth }): string;
    time(options?: { width?: LocaleWidth }): string;
    dateTime(options?: { width?: LocaleWidth }): string;
  };
  options: { weekStartsOn: 0; firstWeekContainsDate: 1 };
  localize: {
    ordinalNumber(value: number): string;
    month(
      value: number,
      options?: { width?: "narrow" | "abbreviated" | "wide" },
    ): string;
    day(
      value: number,
      options?: { width?: "narrow" | "short" | "abbreviated" | "wide" },
    ): string;
    quarter(
      value: number,
      options?: { width?: "narrow" | "abbreviated" | "wide" },
    ): string;
    era(
      value: number,
      options?: { width?: "narrow" | "abbreviated" | "wide" },
    ): string;
    dayPeriod(
      value: string,
      options?: { width?: "narrow" | "abbreviated" | "wide" },
    ): string;
  };
}
export interface FormatOptions {
  locale?: Locale;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  firstWeekContainsDate?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
}
export interface DistanceOptions {
  locale?: Locale;
  addSuffix?: boolean;
  includeSeconds?: boolean;
}
export interface StrictDistanceOptions {
  locale?: Locale;
  addSuffix?: boolean;
  unit?: "second" | "minute" | "hour" | "day" | "month" | "year";
  roundingMethod?: "round" | "floor" | "ceil" | "trunc";
}
export interface Duration {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}
export declare const enUS: Locale;
export declare const longFormatters: Record<
  "P" | "p",
  (token: string, formatLong: Locale["formatLong"]) => string
>;
export declare function format(
  value: DateArg,
  pattern: string,
  options?: FormatOptions,
): string;
export declare function formatISO(
  value: DateArg,
  options?: {
    format?: "basic" | "extended";
    representation?: "complete" | "date" | "time";
  },
): string;
export declare function parse(
  input: string,
  pattern: string,
  reference: DateArg,
  options?: FormatOptions,
): Date;
export declare function parseISO(
  input: string,
  options?: { additionalDigits?: 0 | 1 | 2 },
): Date;
export declare function sub(value: DateArg, duration: Duration): Date;
export declare function isWithinInterval(
  value: DateArg,
  interval: { start: DateArg; end: DateArg },
): boolean;
export declare function toDate(value: DateArg): Date;
export declare function isValid(value: unknown): boolean;
export declare function getDate(value: DateArg): number;
export declare function setDate(value: DateArg, amount: number): Date;
export declare function getHours(value: DateArg): number;
export declare function setHours(value: DateArg, amount: number): Date;
export declare function getMinutes(value: DateArg): number;
export declare function setMinutes(value: DateArg, amount: number): Date;
export declare function getMonth(value: DateArg): number;
export declare function setMonth(value: DateArg, amount: number): Date;
export declare function getSeconds(value: DateArg): number;
export declare function setSeconds(value: DateArg, amount: number): Date;
export declare function getMilliseconds(value: DateArg): number;
export declare function setMilliseconds(value: DateArg, amount: number): Date;
export declare function getYear(value: DateArg): number;
export declare function setYear(value: DateArg, amount: number): Date;
export declare function startOfDay(value: DateArg): Date;
export declare function startOfMonth(value: DateArg): Date;
export declare function startOfYear(value: DateArg): Date;
export declare function endOfDay(value: DateArg): Date;
export declare function endOfMonth(value: DateArg): Date;
export declare function endOfYear(value: DateArg): Date;
export declare function getDaysInMonth(value: DateArg): number;
export declare function addDays(value: DateArg, amount: number): Date;
export declare function addWeeks(value: DateArg, amount: number): Date;
export declare function addMonths(value: DateArg, amount: number): Date;
export declare function addYears(value: DateArg, amount: number): Date;
export declare function addMilliseconds(value: DateArg, amount: number): Date;
export declare function addSeconds(value: DateArg, amount: number): Date;
export declare function addMinutes(value: DateArg, amount: number): Date;
export declare function addHours(value: DateArg, amount: number): Date;
export declare function startOfWeek(
  value: DateArg,
  options?: FormatOptions,
): Date;
export declare function endOfWeek(
  value: DateArg,
  options?: FormatOptions,
): Date;
export declare function getWeek(
  value: DateArg,
  options?: FormatOptions,
): number;
export declare function isAfter(value: DateArg, other: DateArg): boolean;
export declare function isBefore(value: DateArg, other: DateArg): boolean;
export declare function isEqual(value: DateArg, other: DateArg): boolean;
export declare function isSameYear(value: DateArg, other: DateArg): boolean;
export declare function isSameMonth(value: DateArg, other: DateArg): boolean;
export declare function isSameDay(value: DateArg, other: DateArg): boolean;
export declare function isSameHour(value: DateArg, other: DateArg): boolean;
export declare function isToday(value: DateArg): boolean;
export declare function isYesterday(value: DateArg): boolean;
export declare function isThisYear(value: DateArg): boolean;
export declare function formatDistance(
  value: DateArg,
  base: DateArg,
  options?: DistanceOptions,
): string;
export declare function formatDistanceStrict(
  value: DateArg,
  base: DateArg,
  options?: StrictDistanceOptions,
): string;
export declare function formatDistanceToNow(
  value: DateArg,
  options?: DistanceOptions,
): string;
export declare function formatDistanceToNowStrict(
  value: DateArg,
  options?: StrictDistanceOptions,
): string;
