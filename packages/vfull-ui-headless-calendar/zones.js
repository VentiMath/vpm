// VPM Intl time-zone implementation, retained from the earlier independent layer.
// Named time zones are read from the IANA database through Intl, as
// temporal-polyfill reads them, so neither the polyfill nor a native Temporal is
// required. Instants are sampled no earlier than 1653, before any zone's first
// transition, which also keeps every engine's year output unambiguous.
const MIN_ZONE_SAMPLE_SEC = -1e10;
const MAX_ZONE_SAMPLE_SEC = 864e10;
const zoneFormats = new Map();
function getZoneFormat(timeZone) {
    let format = zoneFormats.get(timeZone);
    if (format === undefined) {
        format = new Intl.DateTimeFormat('en-u-hc-h23', {
            calendar: 'iso8601',
            timeZone,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
        });
        zoneFormats.set(timeZone, format);
    }
    return format;
}
// "2024-03-10, 03:00:00": this locale and calendar's numeric layout. format()
// costs about a third of formatToParts(), which remains the fallback for an
// engine that lays the fields out differently.
const ZONE_FORMAT_RE = /^(\d+)-(\d+)-(\d+), (\d+):(\d+):(\d+)$/;
// The zone's offset from UTC, in seconds, at an instant in epoch seconds.
function getZoneOffsetSec(timeZone, epochSec) {
    const sampleSec = Math.min(Math.max(epochSec, MIN_ZONE_SAMPLE_SEC), MAX_ZONE_SAMPLE_SEC);
    const format = getZoneFormat(timeZone);
    let year, month, day, hour, minute, second;
    const match = ZONE_FORMAT_RE.exec(format.format(sampleSec * 1000));
    if (match) {
        [, year, month, day, hour, minute, second] = match;
    }
    else {
        const fields = {};
        for (const part of format.formatToParts(sampleSec * 1000)) {
            fields[part.type] = part.value;
        }
        ({ year, month, day, hour, minute, second } = fields);
    }
    const wallSec = epochDaysFromCivil(Number(year), Number(month), Number(day)) * 86400 +
        Number(hour) * 3600 + Number(minute) * 60 + Number(second);
    return wallSec - sampleSec;
}
// Days since 1970-01-01 for a proleptic Gregorian date. Unlike Date.UTC this
// has no range limit, so the wall-clock reading of the latest Date instant in a
// zone ahead of UTC still converts.
function epochDaysFromCivil(year, month, day) {
    const y = month <= 2 ? year - 1 : year;
    const era = Math.floor(y / 400);
    const yearOfEra = y - era * 400;
    const dayOfYear = Math.floor((153 * (month > 2 ? month - 3 : month + 9) + 2) / 5) + day - 1;
    const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
    return era * 146097 + dayOfEra - 719468;
}
// The epoch milliseconds for a wall-clock time (as a UTC-based marker) in a
// zone, and the offset in seconds there. Like Temporal's 'compatible'
// disambiguation, a repeated wall-clock time takes its earlier instant and a
// skipped one is moved forward by the gap.
function zonedWallToEpoch(timeZone, marker) {
    const wallMs = marker.valueOf();
    const subSecondMs = ((wallMs % 1000) + 1000) % 1000;
    const wallSec = (wallMs - subSecondMs) / 1000;
    const offsetBefore = getZoneOffsetSec(timeZone, wallSec - 86400);
    const offsetAfter = getZoneOffsetSec(timeZone, wallSec + 86400);
    if (offsetBefore === offsetAfter) {
        return { epochMs: (wallSec - offsetBefore) * 1000 + subSecondMs, offsetSec: offsetBefore };
    }
    const withOffsetBefore = wallSec - offsetBefore;
    const offsetThere = getZoneOffsetSec(timeZone, withOffsetBefore);
    if (offsetThere === getZoneOffsetSec(timeZone, wallSec - offsetAfter)) {
        // the offset changes within a day of this time, but not at it
        return { epochMs: (wallSec - offsetThere) * 1000 + subSecondMs, offsetSec: offsetThere };
    }
    // When the offset decreased the wall-clock time occurs twice, and the earlier
    // occurrence uses the offset from before the transition. When it increased
    // the time was skipped, and reading it with the offset from before moves it
    // forward by the gap, past the transition.
    return { epochMs: withOffsetBefore * 1000 + subSecondMs, offsetSec: offsetThere };
}

export {getZoneOffsetSec, zonedWallToEpoch};
