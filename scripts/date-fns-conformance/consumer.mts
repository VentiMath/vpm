import {
  format,
  parse,
  parseISO,
  addMonths,
  sub,
  formatDistanceToNowStrict,
  enUS,
} from "vdate-fns";
import { formatISO } from "vdate-fns/formatISO";
import { enUS as locale } from "vdate-fns/locale/en-US";
import type { Locale } from "vdate-fns/locale";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
const l: Locale = locale;
const d: Date = parse("02/29/2024", "P", new Date(), { locale: l });
const s: string = format(addMonths(d, 1), "MMM d, yyyy", { locale: enUS });
formatISO(sub(parseISO("2026-11-12"), { days: 1 }));
formatDistanceToNowStrict(d, { addSuffix: true, unit: "day" });
new AdapterDateFns({ locale: l }).format(d, "fullDate");
// @ts-expect-error no nonexistent locale support
format(d, "P", { locale: { code: "xx" } });
// @ts-expect-error date values are not arbitrary objects
parseISO({});
// @ts-expect-error unit must be known
formatDistanceToNowStrict(d, { unit: "fortnight" });
void s;
