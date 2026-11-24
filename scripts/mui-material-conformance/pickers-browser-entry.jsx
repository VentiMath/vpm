import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enUS } from "date-fns/locale/en-US";

const host = document.body.appendChild(document.createElement("main"));
host.style.cssText = "position:absolute;top:80px;left:120px";
const root = createRoot(host);
window.changes = [];
function Field({ kind, reduceAnimations, placement }) {
  const [value, setValue] = React.useState(new Date(2026, 10, 12, 13, 30));
  const Picker = kind === "date" ? DatePicker : DateTimePicker;
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enUS}>
      <Picker
        label="Round start"
        value={value}
        reduceAnimations={reduceAnimations}
        slotProps={placement ? { popper: { placement } } : undefined}
        onChange={(next) => {
          window.changes.push(next ? next.getDate() : null);
          setValue(next);
        }}
      />
    </LocalizationProvider>
  );
}
// A new key gives each scene its own picker and closed state.
let scene = 0;
window.draw = (kind, options = {}) => {
  window.changes = [];
  flushSync(() => root.render(<Field key={++scene} kind={kind} {...options} />));
};
window.opener = () => host.querySelector("button");
window.popup = () => document.querySelector(".MuiPickerPopper-root");
window.days = () =>
  Array.from(document.querySelectorAll('button[role="gridcell"]'));
// What a person can see and use: the popup's place against its field, whether
// its panel is shown, and the month it offers.
window.report = () => {
  const panel = window.popup();
  if (!panel) return null;
  const paper = panel.querySelector(".MuiPickerPopper-paper"),
    style = paper && getComputedStyle(paper),
    field = host.querySelector(".MuiPickersTextField-root, .MuiTextField-root"),
    f = field.getBoundingClientRect(),
    p = panel.getBoundingClientRect(),
    days = window.days();
  return {
    role: panel.getAttribute("role"),
    side: panel.dataset.popperPlacement,
    left: Math.round(p.left - f.left),
    below: Math.round(p.top - f.bottom),
    above: Math.round(f.top - p.bottom),
    shown:
      !!style &&
      getComputedStyle(panel).display !== "none" &&
      style.visibility === "visible" &&
      style.opacity === "1",
    days: days.length,
    selected: days
      .filter((day) => day.getAttribute("aria-selected") === "true")
      .map((day) => day.textContent),
  };
};
