import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import * as api from "react-transition-group";
import Collapse from "@mui/material/Collapse";
import Fade from "@mui/material/Fade";
import Grow from "@mui/material/Grow";
import Slide from "@mui/material/Slide";
import Zoom from "@mui/material/Zoom";
import Button from "@mui/material/Button";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import contracts from "./contracts.cjs";
const h = React.createElement;
const check = (value, message) => {
  if (!value) throw Error(message);
};
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (predicate) => {
  for (let i = 0; i < 300; i++) {
    if (predicate()) return;
    await pause(10);
  }
  throw Error("Timed out: " + predicate);
};
export default function setup(variant) {
  window.transitionCases ??= {};
  window.transitionCases[variant] = async () => {
    const snapshots = await contracts(React, createRoot, flushSync, api);
    for (const iframe of [false, true]) {
      let frame;
      if (iframe) {
        frame = document.createElement("iframe");
        frame.style = "width:550px;height:800px";
        document.body.append(frame);
      }
      const doc = iframe ? frame.contentDocument : document,
        win = doc.defaultView;
      const host = doc.createElement("div");
      doc.body.append(host);
      const root = createRoot(host),
        cache = createCache({ key: "test" + variant, container: doc.head });
      const wrap = (child) =>
        h(
          CacheProvider,
          { value: cache },
          h(ThemeProvider, { theme: createTheme() }, child),
        );
      const render = (child) => flushSync(() => root.render(wrap(child)));
      try {
        for (const [name, C] of Object.entries({
          Collapse,
          Fade,
          Grow,
          Slide,
          Zoom,
        })) {
          const events = [];
          const draw = (value) =>
            render(
              h(
                C,
                {
                  in: value,
                  timeout: 30,
                  onEnter: (node) => {
                    check(
                      node.ownerDocument === doc,
                      "MUI node signature/owner document",
                    );
                    events.push("enter");
                  },
                  onEntered: () => events.push("entered"),
                  onExited: () => events.push("exited"),
                },
                h("button", { style: { height: 48 } }, "Practice"),
              ),
            );
          draw(false);
          draw(true);
          await until(() => events.includes("entered"));
          const node = host.querySelector("button");
          node.focus();
          check(doc.activeElement === node, "Focus in owner document");
          draw(true);
          check(host.querySelector("button") === node, "Caller node preserved");
          check(doc.activeElement === node, "Visible rerender retains focus");
          draw(false);
          await until(() => events.includes("exited"));
          snapshots.push({
            caller: name,
            iframe,
            events,
            same: host.querySelector("button") === node,
          });
          render(null);
        }
        for (const reduceAnimations of [false, true]) {
          render(
            h(
              LocalizationProvider,
              { dateAdapter: AdapterDateFns },
              h(DateCalendar, {
                defaultValue: new Date(2026, 10, 7),
                reduceAnimations,
              }),
            ),
          );
          await until(() => host.querySelector('[aria-label="Next month"]'));
          const applied = new Set(),
            proto = win.DOMTokenList.prototype,
            add = proto.add;
          proto.add = function (...tokens) {
            for (const token of tokens)
              if (/^MuiPickersSlideTransition-slide/.test(token))
                applied.add(token);
            return add.apply(this, tokens);
          };
          try {
            for (const [label, month] of [
              ["Next month", "December 2026"],
              ["Previous month", "November 2026"],
            ]) {
              applied.clear();
              const button = host.querySelector('[aria-label="' + label + '"]');
              button.focus();
              button.click();
              await until(() => host.textContent.includes(month));
              if (!reduceAnimations) await until(() => applied.size > 0);
              await until(
                () =>
                  !host.querySelector(
                    ".MuiPickersSlideTransition-slideEnterActive,.MuiPickersSlideTransition-slideExit",
                  ),
              );
              check(
                doc.activeElement === button,
                "Month navigation keeps focus",
              );
              snapshots.push({
                caller: "DateCalendar",
                iframe,
                reduceAnimations,
                month,
                classes: [...applied].sort(),
              });
            }
          } finally {
            proto.add = add;
            render(null);
          }
        }
        // ButtonBase uses TransitionGroup with its own Ripple child, not Transition.
        render(h(Button, { variant: "contained" }, "Action"));
        const button = host.querySelector("button");
        button.dispatchEvent(
          new win.MouseEvent("mousedown", { bubbles: true, button: 0 }),
        );
        await until(() => host.querySelector(".MuiTouchRipple-ripple"));
        button.dispatchEvent(
          new win.MouseEvent("mouseup", { bubbles: true, button: 0 }),
        );
        await until(() => !host.querySelector(".MuiTouchRipple-ripple"));
        snapshots.push({ caller: "Button ripple", iframe, removed: true });
      } finally {
        flushSync(() => root.unmount());
        cache.sheet.flush();
        host.remove();
        frame?.remove();
      }
    }
    return snapshots;
  };
}
