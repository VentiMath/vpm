import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import Collapse from "@mui/material/Collapse";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import addClass from "dom-helpers/addClass";
import removeClass from "dom-helpers/removeClass";
const h = React.createElement;
const check = (ok, message) => {
  if (!ok) throw Error(message);
};
const until = async (fn) => {
  for (let i = 0; i < 250; i++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw Error("Timed out: " + String(fn));
};
export default function setup(variant) {
  const state = { calls: [], fail: false };
  window.domAudit ??= {};
  window.domAudit[variant] = state;
  state.run = async () => {
    const snapshots = [];
    for (const iframe of [false, true]) {
      let frame;
      if (iframe) {
        frame = document.createElement("iframe");
        frame.style = "width:500px;height:700px";
        document.body.append(frame);
      }
      const doc = iframe ? frame.contentDocument : document,
        win = doc.defaultView;
      const host = doc.createElement("div");
      doc.body.append(host);
      const cache = createCache({
        key: "audit" + variant + (iframe ? "frame" : "main"),
        container: doc.head,
      });
      const root = createRoot(host),
        theme = createTheme();
      const wrap = (child) =>
        h(CacheProvider, { value: cache }, h(ThemeProvider, { theme }, child));
      try {
        state.calls.length = 0;
        state.fail = true;
        // These are the unchanged MUI props used by both navigation Collapse sites.
        const phases = [];
        const renderCollapse = (open) =>
          flushSync(() =>
            root.render(
              wrap(
                h(
                  Collapse,
                  {
                    in: open,
                    className: "collapse-children",
                    timeout: 40,
                    onEntered: () => phases.push("entered"),
                    onExited: () => phases.push("exited"),
                  },
                  h(
                    "button",
                    { id: "navigation-child", style: { height: 48 } },
                    "Practice",
                  ),
                ),
              ),
            ),
          );
        renderCollapse(false);
        renderCollapse(true);
        await until(() => phases.includes("entered"));
        const node = host.querySelector(".MuiCollapse-root");
        check(
          win.getComputedStyle(node).height !== "0px",
          "Collapse expanded height",
        );
        const button = host.querySelector("button");
        button.focus();
        check(doc.activeElement === button, "Owner-document focus");
        renderCollapse(false);
        await until(() => phases.includes("exited"));
        await until(() => win.getComputedStyle(node).height === "0px");
        check(
          win.getComputedStyle(node).height === "0px",
          "Collapse collapsed height",
        );
        check(state.calls.length === 0, "Collapse must not call DOM helpers");
        snapshots.push({
          iframe,
          caller: "Collapse",
          phases,
          height: win.getComputedStyle(node).height,
          calls: 0,
        });
        state.fail = false;
        flushSync(() =>
          root.render(
            wrap(
              h(
                LocalizationProvider,
                { dateAdapter: AdapterDateFns },
                h(DateCalendar, {
                  defaultValue: new Date(2026, 10, 7),
                  reduceAnimations: false,
                }),
              ),
            ),
          ),
        );
        await until(() => host.querySelector('[aria-label="Next month"]'));
        for (const [buttonLabel, month] of [
          ["Next month", "December 2026"],
          ["Previous month", "November 2026"],
        ]) {
          state.calls.length = 0;
          const nav = host.querySelector('[aria-label="' + buttonLabel + '"]');
          nav.focus();
          nav.click();
          await until(
            () =>
              host.textContent.includes(month) &&
              state.calls.some((x) => x.name === "addClass"),
          );
          // Record applied tokens rather than sampling a transient animation
          // frame: a busy runner may resume after the CSS transition has ended.
          const active = state.calls
            .filter(
              (x) =>
                x.name === "addClass" &&
                /^MuiPickersSlideTransition-slide/.test(x.token),
            )
            .map((x) => x.token)
            .sort();
          check(active.length > 0, "Date-picker transition classes");
          await until(
            () =>
              !host.querySelector(
                ".MuiPickersSlideTransition-slideEnterActive,.MuiPickersSlideTransition-slideExit",
              ),
          );
          check(
            state.calls.some((x) => x.name === "removeClass"),
            "Date-picker removes transition classes",
          );
          check(
            state.calls.every((x) => x.iframe === iframe),
            "Class operations use passed node in its owner document",
          );
          check(doc.activeElement === nav, "Month button keeps focus");
          snapshots.push({
            iframe,
            caller: "DateCalendar",
            month,
            active,
            operations: [...new Set(state.calls.map((x) => x.name))].sort(),
            classesLeft: host.querySelectorAll(
              ".MuiPickersSlideTransition-slideEnterActive,.MuiPickersSlideTransition-slideExit",
            ).length,
          });
        }
        // Positive control: the instrumentation must catch an accidental helper call.
        state.fail = true;
        let caught = false;
        try {
          addClass(host, "probe");
        } catch (e) {
          caught = e.message === "DOM helper probe";
        }
        check(caught, "Throwing helper control");
        state.fail = false;
        for (const tag of ["div", "svg"]) {
          const el =
            tag === "svg"
              ? doc.createElementNS("http://www.w3.org/2000/svg", "svg")
              : doc.createElement(tag);
          el.setAttribute("class", "keep");
          for (const token of ["test", "a.b", "sm:hover", "réponse"]) {
            addClass(el, token);
            addClass(el, token);
            check(el.classList.contains(token), "Added token");
            removeClass(el, token);
            removeClass(el, token);
            check(!el.classList.contains(token), "Removed token");
          }
          check(el.getAttribute("class") === "keep", "Unrelated class remains");
        }
      } finally {
        state.fail = false;
        flushSync(() => root.unmount());
        cache.sheet.flush();
        host.remove();
        frame?.remove();
      }
    }
    return snapshots;
  };
}
