import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { ThemeProvider } from "@mui/system";
import { createTheme } from "@mui/material/styles";
import { scene } from "./steps-scene.jsx";
const host = document.body.appendChild(document.createElement("main"));
const root = createRoot(host);
document.documentElement.style.setProperty("--mui-spacing", "0.25rem");
let theme;
window.draw = (role = "student", activeStep = 0, original = false) => {
  theme ??= createTheme({
    components: window.stepTheme ?? {
      MuiStepper: {
        styleOverrides: {
          root: { "& .MuiStepConnector-horizontal": { top: "2rem" } },
        },
      },
      MuiStepIcon: { styleOverrides: { text: { fontSize: "0.875rem" } } },
    },
  });
  flushSync(() =>
    root.render(
      <ThemeProvider theme={theme}>
        {scene({ role, activeStep, original })}
        <button>Next</button>
      </ThemeProvider>,
    ),
  );
};
