import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { createTheme } from "@mui/material/styles";
import { ThemeProvider } from "@mui/system";
import { scene, steps } from "./step-content-scene.jsx";
const host = document.body.appendChild(document.createElement("main"));
host.style.width = "300px";
const root = createRoot(host);
document.documentElement.style.setProperty("--mui-spacing", "0.5rem");
let theme, props;
window.selected = [];
window.draw = (next = {}) => {
  props = next;
  theme ??= createTheme({
    cssVariables: true,
    components: window.courseStyle ?? {
      MuiStepper: {
        styleOverrides: {
          root: {
            "& .MuiStep-vertical .MuiStepContent-root, & .MuiStepConnector-vertical":
              { marginLeft: "var(--mui-spacing)" },
          },
        },
      },
    },
  });
  const select = (n) => {
    window.selected.push(n);
    window.draw({ ...props, activeStep: n });
  };
  flushSync(() =>
    root.render(
      <ThemeProvider theme={theme}>
        {scene({ ...props, select })}
        <button>Continue</button>
      </ThemeProvider>,
    ),
  );
};
window.reverseSteps = () =>
  window.draw({ ...props, courseSteps: steps.toReversed() });
