import {DateEnv, NativeDateFormatter, createDuration, joinDateTimeFormatParts, parseMarker, formatTimeZoneOffset} from 'vfull-ui-headless-calendar';
import type {DateEnvSettings, Duration, Locale} from 'vfull-ui-headless-calendar';
const locale: Locale = {codeArg: 'en-US', codes: ['en-US'], week: {dow: 0, doy: 1}, simpleNumberFormat: new Intl.NumberFormat('en-US'), options: {}};
const settings: DateEnvSettings = {timeZone: 'America/New_York', calendarSystem: 'gregory', locale};
const env = new DateEnv(settings);
const marker: Date | null = env.createMarker('2024-03-10T02:30:00');
const instant: Date = env.toDate(marker ?? new Date(0));
const wall: Date = env.timestampToMarker(instant.valueOf());
const text: string = joinDateTimeFormatParts(env.formatToParts(wall, new NativeDateFormatter({hour: 'numeric', timeZoneName: 'short'})));
const duration: Duration | null = createDuration({days: 1});
const offset: number = env.offsetForMarker(wall);
const parsed = parseMarker('0050-06-01');
const iso: string = env.formatIso(wall) + formatTimeZoneOffset(offset, true);
// @ts-expect-error settings require a locale
new DateEnv({timeZone: 'UTC', calendarSystem: 'gregory'});
void [text, duration, parsed, iso];

// @ts-expect-error parsing can fail; callers must handle null
const alwaysDate: Date = env.createMarker('invalid');
// @ts-expect-error nonintegral month differences return null
const alwaysMonths: number = env.diffWholeMonths(new Date(0), new Date(1));
void [alwaysDate, alwaysMonths];
