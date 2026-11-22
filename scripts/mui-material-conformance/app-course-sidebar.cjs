"use strict";
const { execFileSync } = require("node:child_process"),
  { esbuild } = require("./paths.cjs");
module.exports = (repo, ref = "origin/main") => {
  const read = (file) =>
    execFileSync("git", ["show", ref + ":" + file], {
      cwd: repo,
      encoding: "utf8",
    });
  const src = read(
    "src/app/(control-panel)/apps/academy/components/views/CourseView.tsx",
  );
  const extract = (source, pattern) => {
    const match = source.match(pattern);
    if (!match) throw Error("Review Academy sidebar fixture: " + pattern);
    return match[0];
  };
  const jsx = extract(src, /<Stepper\b[\s\S]*?<\/Stepper>/);
  const update = extract(
    src,
    /function updateCurrentStep\([^)]*\) \{[\s\S]*?\n  \}/,
  );
  const select = extract(
    src,
    /function handleStepChange\([^)]*\) \{[\s\S]*?\n  \}/,
  );
  const theme = read("src/@fuse/default-settings/FuseDefaultSettings.ts");
  const styles = extract(theme, /MuiStepper: \{[\s\S]*?\n    \},/);
  const spacing = extract(theme, /function spacing\([^)]*\) \{[\s\S]*?\n\}/);
  return esbuild.transformSync(
    spacing +
      "\nwindow.courseStyle={" +
      styles +
      "};window.courseSidebar=function(React,Stepper,Step,StepLabel,StepContent,courseSteps,activeStep,setActiveStep){const course={totalSteps:courseSteps.length};" +
      update +
      "\n" +
      select +
      "\nreturn (" +
      jsx +
      ");}",
    { loader: "tsx" },
  ).code;
};
