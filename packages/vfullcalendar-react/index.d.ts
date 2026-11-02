import type * as React from "react";
export type DateInput = string | number | Date | number[];
export type DurationInput =
  | string
  | number
  | {
      years?: number;
      months?: number;
      weeks?: number;
      days?: number;
      hours?: number;
      minutes?: number;
      seconds?: number;
      milliseconds?: number;
    };
export interface Duration {
  years: number;
  months: number;
  days: number;
  milliseconds: number;
}
export interface LocaleInput {
  code?: string;
  week?: { dow?: number; doy?: number };
  direction?: "ltr" | "rtl";
  buttonText?: Record<string, string>;
}
export interface PluginInput {
  readonly name: string;
}
export type ClassNameInput = string | string[] | false | null | undefined;
export type ClassNameGenerator<T> =
  | ClassNameInput
  | ((info: T) => ClassNameInput);
export type ContentGenerator<T> =
  | React.ReactNode
  | ((info: T) => React.ReactNode | true | { html: string });
export interface FormatDateOptions extends Intl.DateTimeFormatOptions {
  locale?: string | LocaleInput;
  timeZone?: string;
  omitZeroMinute?: boolean;
  meridiem?: false | "narrow" | "short" | "lowercase";
  omitCommas?: boolean;
}
export interface FormatRangeOptions extends FormatDateOptions {
  isEndExclusive?: boolean;
}
export function formatDate(
  date: DateInput,
  options?: FormatDateOptions,
): string;
export function formatRange(
  start: DateInput,
  end: DateInput,
  options?: FormatRangeOptions,
): string;
export function joinClassNames(
  ...values: Array<ClassNameInput | ClassNameInput[]>
): string;
export const version: string;
export const globalLocales: LocaleInput[];
export const globalPlugins: PluginInput[];
export { JsonRequestError } from "vfullcalendar-core/protected-api";
export interface EventInput {
  id?: string;
  title?: string;
  start?: DateInput;
  date?: DateInput;
  end?: DateInput | null;
  allDay?: boolean;
  extendedProps?: Record<string, any>;
  url?: string;
  display?: string;
  groupId?: string;
  className?: string;
  classNames?: string[];
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  editable?: boolean;
  startEditable?: boolean;
  durationEditable?: boolean;
}
export class EventApi {
  readonly id: string;
  readonly title: string;
  readonly allDay: boolean;
  readonly start: Date | null;
  readonly end: Date | null;
  readonly startStr: string;
  readonly endStr: string;
  readonly extendedProps: Readonly<Record<string, any>>;
  readonly url: string;
  readonly backgroundColor: string;
  readonly borderColor: string;
  readonly textColor: string;
  readonly display: string;
  readonly classNames: string[];
  setProp(name: string, value: unknown): void;
  setExtendedProp(name: string, value: unknown): void;
  setDates(
    start: DateInput,
    end?: DateInput | null,
    options?: { allDay?: boolean },
  ): void;
  setStart(start: DateInput, options?: { maintainDuration?: boolean }): void;
  setEnd(end: DateInput | null): void;
  setAllDay(allDay: boolean): void;
  moveDates(delta: DurationInput): void;
  remove(): void;
  toPlainObject(): EventInput;
  toJSON(): EventInput;
}
export interface ViewApi {
  type: string;
  title: string;
  calendar: CalendarApi;
  activeStart: Date;
  activeEnd: Date;
  currentStart: Date;
  currentEnd: Date;
}
export interface DatesSetInfo {
  start: Date;
  end: Date;
  startStr: string;
  endStr: string;
  timeZone: string;
  view: ViewApi;
}
export interface DayCellInfo {
  date: Date;
  isToday: boolean;
  isOther: boolean;
  isPast: boolean;
  isFuture: boolean;
  view: ViewApi;
}
export type DayHeaderInfo = DayCellInfo;
export interface EventDisplayInfo {
  event: EventApi;
  view: ViewApi;
  timeText: string;
  isStart: boolean;
  isEnd: boolean;
  isMirror: boolean;
  isPast: boolean;
  isFuture: boolean;
  isToday: boolean;
  el: HTMLElement | null;
}
export interface EventClickInfo {
  event: EventApi;
  el: HTMLElement;
  jsEvent: MouseEvent;
  view: ViewApi;
}
export interface DateSelectInfo {
  start: Date;
  end: Date;
  startStr: string;
  endStr: string;
  allDay: boolean;
  jsEvent: MouseEvent;
  view: ViewApi;
}
export interface DateClickInfo {
  date: Date;
  dateStr: string;
  allDay: boolean;
  dayEl: HTMLElement;
  jsEvent: MouseEvent;
  view: ViewApi;
}
export interface DateUnselectInfo {
  jsEvent: MouseEvent | null;
  view: ViewApi;
}
export interface EventAddInfo {
  event: EventApi;
  relatedEvents: EventApi[];
  revert(): void;
}
export interface EventChangeInfo extends EventAddInfo {
  oldEvent: EventApi;
}
export type EventRemoveInfo = EventAddInfo;
export interface EventDropInfo extends EventChangeInfo {
  delta: Duration;
  el: HTMLElement;
  jsEvent: MouseEvent;
  view: ViewApi;
}
export interface EventResizeDoneInfo extends EventChangeInfo {
  startDelta: Duration;
  endDelta: Duration;
  el: HTMLElement;
  jsEvent: MouseEvent;
  view: ViewApi;
}
export interface EventSourceFuncInfo extends DatesSetInfo {}
export type EventSourceFunc = (
  info: EventSourceFuncInfo,
  success: (events: EventInput[]) => void,
  failure: (error: Error) => void,
) => void | Promise<EventInput[]>;
export type EventSourceInput =
  | EventInput[]
  | EventSourceFunc
  | string
  | {
      url?: string;
      method?: string;
      events?: EventInput[] | EventSourceFunc;
      extraParams?: Record<string, unknown> | (() => Record<string, unknown>);
      success?: (events: EventInput[]) => EventInput[] | void;
      failure?: (error: Error) => void;
    };
export interface ViewOptions {
  titleFormat?: FormatDateOptions;
}
export interface CalendarOptions {
  plugins?: PluginInput[];
  initialDate?: DateInput;
  initialView?: string;
  initialEvents?: EventInput[];
  events?: EventSourceInput;
  eventSources?: EventSourceInput[];
  timeZone?: string;
  locale?: string | LocaleInput;
  locales?: LocaleInput[];
  firstDay?: number;
  direction?: "ltr" | "rtl";
  weekNumberCalculation?: "ISO" | "local";
  now?: DateInput | (() => DateInput);
  headerToolbar?: false | { start?: string; center?: string; end?: string };
  toolbarClass?: ClassNameGenerator<{ view: ViewApi }>;
  buttonText?: Record<string, string>;
  height?: number | string;
  contentHeight?: number | string;
  className?: string;
  style?: React.CSSProperties;
  borderless?: boolean;
  weekends?: boolean;
  fixedWeekCount?: boolean;
  editable?: boolean;
  eventStartEditable?: boolean;
  eventDurationEditable?: boolean;
  selectable?: boolean;
  selectMirror?: boolean;
  dayMaxEvents?: boolean | number;
  eventDisplay?: string;
  longPressDelay?: number;
  dateIncrement?: DurationInput;
  views?: Record<string, ViewOptions>;
  titleFormat?: FormatDateOptions;
  dayHeaderFormat?: FormatDateOptions;
  eventTimeFormat?: FormatDateOptions;
  slotMinTime?: DurationInput;
  slotMaxTime?: DurationInput;
  slotDuration?: DurationInput;
  snapDuration?: DurationInput;
  scrollTime?: DurationInput;
  dayHeaderClass?: ClassNameGenerator<DayHeaderInfo>;
  dayHeaderInnerClass?: ClassNameGenerator<DayHeaderInfo>;
  dayHeaderContent?: ContentGenerator<DayHeaderInfo>;
  dayCellClass?: ClassNameGenerator<DayCellInfo>;
  dayCellTopClass?: ClassNameGenerator<DayCellInfo>;
  dayCellTopInnerClass?: ClassNameGenerator<DayCellInfo>;
  dayCellTopContent?: ContentGenerator<DayCellInfo>;
  eventClass?: ClassNameGenerator<EventDisplayInfo>;
  eventContent?: ContentGenerator<EventDisplayInfo>;
  datesSet?: (info: DatesSetInfo) => void;
  eventsSet?: (events: EventApi[]) => void;
  select?: (info: DateSelectInfo) => void;
  unselect?: (info: DateUnselectInfo) => void;
  selectAllow?: (info: DateSelectInfo) => boolean;
  dateClick?: (info: DateClickInfo) => void;
  eventClick?: (info: EventClickInfo) => void;
  eventDrop?: (info: EventDropInfo) => void;
  eventResize?: (info: EventResizeDoneInfo) => void;
  eventAdd?: (info: EventAddInfo) => void;
  eventChange?: (info: EventChangeInfo) => void;
  eventRemove?: (info: EventRemoveInfo) => void;
  eventDidMount?: (info: EventDisplayInfo & { el: HTMLElement }) => void;
  eventWillUnmount?: (info: EventDisplayInfo & { el: HTMLElement }) => void;
  viewDidMount?: (info: { view: ViewApi; el: HTMLElement }) => void;
  viewWillUnmount?: (info: { view: ViewApi; el: HTMLElement }) => void;
  loading?: (active: boolean) => void;
  eventSourceFailure?: (error: Error) => void;
}
export class CalendarApi {
  readonly view: ViewApi;
  getDate(): Date;
  getOption(name: string): unknown;
  setOption(name: string, value: unknown): void;
  prev(): void;
  next(): void;
  today(): void;
  prevYear(): void;
  nextYear(): void;
  gotoDate(date: DateInput): void;
  incrementDate(delta: DurationInput): void;
  changeView(view: string, date?: DateInput): void;
  getEvents(): EventApi[];
  getEventById(id: string): EventApi | null;
  addEvent(event: EventInput): EventApi | null;
  removeAllEvents(): void;
  select(input: {
    start: DateInput;
    end?: DateInput;
    allDay?: boolean;
    jsEvent?: MouseEvent;
  }): void;
  select(start: DateInput, end?: DateInput): void;
  unselect(jsEvent?: MouseEvent): void;
  batchRendering<T>(fn: () => T): T;
  refetchEvents(): Promise<void>;
  formatIso(
    date: DateInput,
    options?: { omitTime?: boolean; omitTimeZoneOffset?: boolean },
  ): string;
}
export interface CalendarRef {
  getApi(): CalendarApi;
}
export const Calendar: React.ForwardRefExoticComponent<
  CalendarOptions & React.RefAttributes<CalendarRef>
>;
export default Calendar;
export function useCalendarController(): CalendarApi | null;
