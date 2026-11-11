import moment, { type Duration } from "vmoment";
import type { Moment } from "vmoment/moment";
const end: Moment = moment("2071-07-28").add(15, "days");
const duration: Duration = moment.duration(
  end.diff(moment(), "seconds"),
  "seconds",
);
const fields: number[] = [
  Number(duration.asDays().toFixed(0)),
  duration.hours(),
  duration.minutes(),
  duration.seconds(),
];
const input: unknown = end;
if (moment.isMoment(input)) input.clone().add(1, "hours");
// @ts-expect-error calendar months are outside countdown scope
moment().add(1, "months");
void fields;
