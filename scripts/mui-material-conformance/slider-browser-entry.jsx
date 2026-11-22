import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { createTheme } from "@mui/material/styles";
import { ThemeProvider } from "@mui/system";
import Slider from "@font-slider";
import { scene } from "./slider-scene.jsx";
const host = document.body.appendChild(document.createElement("main"));
host.style.cssText = "width:240px;margin:40px";
document.documentElement.style.setProperty("--mui-spacing", "0.5rem");
const root = createRoot(host);
window.events = [];
function Controlled({ extra }) {
  const [value, set] = React.useState(16);
  return scene({
    value,
    name: "font",
    onChange(e, n, i) {
      window.events.push(["change", n, e.target.value, i]);
      set(n);
    },
    onChangeCommitted(e, n) {
      window.events.push(["commit", n]);
      document.documentElement.style.fontSize = value + "px";
    },
    ...extra,
  });
}
window.draw = (extra = {}, original = false, rtl = false) => {
  const theme = createTheme({
    direction: rtl ? "rtl" : "ltr",
    components: window.appOverrides ?? {
      MuiSlider: { defaultProps: { size: "small", color: "secondary" } },
    },
  });
  const child =
    original && window.OriginalFont ? (
      <window.OriginalFont React={React} Slider={Slider} />
    ) : (
      <Controlled extra={extra} />
    );
  flushSync(() =>
    root.render(
      <ThemeProvider theme={theme}>
        <div dir={theme.direction}>{child}</div>
      </ThemeProvider>,
    ),
  );
};

window.keyboardCycle = () => {
  const input = host.querySelector("input");
  window.events.length = 0;
  for (const key of ["ArrowRight", "ArrowLeft"])
    flushSync(() =>
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key,
          code: key,
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
  return window.events.map((entry) => entry[0] + "=" + entry[1]).join(",");
};
