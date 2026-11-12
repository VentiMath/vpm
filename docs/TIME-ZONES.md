# Calendar days and runtime timezone data

Checked November 12, 2026 on Node 24.22.1, Bun 1.4.4 and Chrome. The current
VPM calendar and countdown implementations already preserve the required date
arithmetic. The regression suite now gates that behavior against fixed expected
instants, rather than comparing two libraries that share the same timezone data.

## British Columbia

Vancouver no longer falls back in November 2026: its winter offset is UTC−07:00.
This does not retroactively change historical winters to UTC−07:00. Seattle
(`America/Los_Angeles`) continues its seasonal changes. Regional differences
must be represented by IANA names, not a province-wide or “Pacific” fixed offset.

The BC government announced the change on March 2; IANA included it in 2026b.
Subsequent Canadian changes are recorded in later IANA releases. Software can
still have stale timezone data even when the operating-system clock looks right.
Google documented delayed updates affecting some of its devices and products.

- [BC announcement and regional scope](https://news.gov.bc.ca/releases/2026AG0013-000209)
- [IANA 2026b](https://www.iana.org/time-zones/releases/2026b)
- [IANA 2026e](https://www.iana.org/time-zones/releases/2026e)
- [Google's October 23 update notice](https://blog.google/intl/en-ca/feed/what-the-canadian-time-zone-changes-mean-for-your-google-products/)

The November 9 [Chromium report](https://ramsayleung.github.io/en/post/2026/the_chromium_bug_caused_by_25_hour_day/)
describes a different failure: adding 24 elapsed hours and rounding to local
midnight can remain on the same date during a 25-hour day, repeatedly scheduling
an immediate timer. Calendar-day arithmetic and elapsed-duration arithmetic
must remain distinct, including where seasonal changes still exist.

## VPM behavior

- `vmoment.add(1, 'day')` changes the local calendar date; adding 24 hours changes
  the instant by exactly 86,400,000 milliseconds. It obtains local rules from the
  runtime and system timezone data.
- `vfull-ui-headless-calendar` stores civil fields in UTC-based markers and
  converts at the timezone boundary with `Intl`. A 24-hour increment to a civil
  marker is calendar arithmetic, not a claim that the real day lasts 24 hours.
- `vfullcalendar-react` keeps exact event instants alongside those markers.
  All-day defaults end on the next calendar date; a default timed hour is one
  elapsed hour, even during a repeated hour. Date-only inputs remain date-only.
- `vfirebase-functions` passes the requested IANA `timeZone` to Cloud Scheduler;
  it does not calculate the next cron occurrence locally. Backend timeouts,
  retries and token expirations use elapsed/UTC time and must not gain DST offsets.

The new guard covers Vancouver, its `Canada/Pacific` alias, Seattle, Dawson Creek
and Lord Howe's half-hour changes. Vancouver's November 2, 2025 day is 25 hours;
March 8, 2026 is 23 hours; November 1, 2026 is 24 hours. The Seattle November 1
control remains 25 hours. Chrome checks also render events across that boundary
and verify their exact stored start/end instants, with both local and named zones.

```sh
node scripts/time-zone-conformance/run.cjs
bun scripts/time-zone-conformance/run.cjs
node scripts/time-zone-conformance/browser.cjs
```

These checks reject stale data in CI. They do not update an end user's browser
or repair previously saved appointments. Upgrade affected runtime/system timezone
data and verify the actual target environment. Use the intended IANA zone when
it is known; do not substitute Phoenix or a fixed offset for Vancouver's entire
history. An incorrect/unknown device timezone cannot safely be guessed by VPM.
