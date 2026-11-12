import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enUS } from "date-fns/locale/en-US";
const wait = () => new Promise((r) => setTimeout(r, 60));
const host = document.body.appendChild(document.createElement("div"));
let values = [];
function Fixture() {
  const [value, setValue] = React.useState(new Date(2026, 10, 12, 13, 30));
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enUS}>
      <DateTimePicker
        label="Event start"
        value={value}
        onChange={(v) => {
          values.push(
            v && !Number.isNaN(+v)
              ? [
                  v.getFullYear(),
                  v.getMonth() + 1,
                  v.getDate(),
                  v.getHours(),
                  v.getMinutes(),
                ]
              : null,
          );
          setValue(v);
        }}
        reduceAnimations
      />
    </LocalizationProvider>
  );
}
const root = createRoot(host);
window.formVariant = VPM_DATE_VARIANT;
window.runForms = async () => {
  flushSync(() => root.render(<Fixture />));
  await wait();
  const out = [];
  const snapshot = () =>
    Array.from(host.querySelectorAll('[role="spinbutton"]'), (e) => [
      e.getAttribute("aria-label"),
      e.getAttribute("aria-valuenow"),
      e.textContent,
    ]);
  out.push(snapshot());
  const open = host.querySelector("button");
  if (!open) throw Error("Missing calendar button");
  open.click();
  await wait();
  const month = Array.from(document.querySelectorAll('[role="gridcell"]')).map(
    (e) => [e.textContent, e.getAttribute("aria-selected")],
  );
  if (!month.length) throw Error("Calendar did not open");
  out.push(month);
  const day = Array.from(
    document.querySelectorAll('button[role="gridcell"]'),
  ).find((e) => e.textContent === "20" && e.getAttribute("tabindex") !== null);
  if (!day) throw Error("Missing day");
  day.click();
  await wait();
  out.push(values.slice(), snapshot());
  open.click();
  await wait();
  window.finishPicker = () => {
    out.push(values.slice(), snapshot());
    if (
      !values.some((v) => v?.[2] === 20) ||
      !values.some((v) => v?.[0] === 2027) ||
      !values.some((v) => v?.[4] === 31)
    )
      throw Error(
        "Editing did not update dates: " +
          JSON.stringify({ values, sections: snapshot() }),
      );
    root.unmount();
    return out;
  };
  return true;
};
