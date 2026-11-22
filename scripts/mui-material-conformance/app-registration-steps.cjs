"use strict";
const { execFileSync } = require("node:child_process");
const { esbuild } = require("./paths.cjs");
module.exports = (repo, ref = "origin/main") => {
  const read = (file) =>
    execFileSync("git", ["show", ref + ":" + file], {
      cwd: repo,
      encoding: "utf8",
    });
  const src = read("src/components/WARML/WARMLInterestForm.tsx"),
    translations = read("src/i18n-homegrown/en.ts");
  const getLabels = src
    .match(/export function getStepLabels\b[\s\S]*?\n}/)?.[0]
    ?.replace("export ", "");
  const form = src.match(/<Stepper\b[\s\S]*?<\/Stepper>/)?.[0];
  const keys = [...new Set(getLabels?.match(/WARML_STEP_[A-Z_]+/g))];
  if (!form || !keys.length)
    throw Error("Review the registration form fixture");
  const dictionary = Object.fromEntries(
    keys.map((k) => {
      const m = translations.match(new RegExp(k + ": '([^']*)'"));
      if (!m) throw Error("Missing " + k);
      return [k, m[1]];
    }),
  );
  const theme = read("src/@fuse/default-settings/FuseDefaultSettings.ts");
  const overrides = ["MuiStepper", "MuiStepIcon"]
    .map((k) => {
      const m = theme.match(new RegExp(k + ": \\{[\\s\\S]*?\\n    \\},"));
      if (!m) throw Error("Missing " + k);
      return m[0];
    })
    .join("\n");
  const spacing = theme.match(/function spacing\([^)]*\) \{[\s\S]*?\n\}/)[0];
  return esbuild.transformSync(
    getLabels +
      "\n" +
      spacing +
      "\nwindow.stepTheme={" +
      overrides +
      "};window.registrationSteps=function(React,Stepper,Step,StepLabel,role,activeStep){const dict=" +
      JSON.stringify(dictionary) +
      ";const stepLabels=getStepLabels(role,k=>dict[k]);return (" +
      form +
      ");}",
    { loader: "tsx" },
  ).code;
};
