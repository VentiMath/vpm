import React from "react";
import Stepper from "@course-stepper";
import Step from "@course-step";
import StepLabel from "@course-label";
import StepContent from "@course-content";
export const steps = [
  "Introduction",
  "Examples",
  "Practice",
  "Review",
  "Challenge",
  "Conclusion",
].map((title, order) => ({
  title,
  id: "step-" + order,
  subtitle: "Subtitle for " + title,
  order,
}));
export function scene({
  activeStep = 1,
  courseSteps = steps,
  expanded = true,
  content = {},
  alternativeLabel = false,
  select = () => {},
  original = false,
} = {}) {
  if (original && typeof window !== "undefined" && window.courseSidebar)
    return window.courseSidebar(
      React,
      Stepper,
      Step,
      StepLabel,
      StepContent,
      courseSteps,
      activeStep,
      select,
    );
  return (
    <Stepper
      classes={{ root: "p-8" }}
      activeStep={activeStep - 1}
      orientation="vertical"
      alternativeLabel={alternativeLabel}
    >
      {courseSteps.map((step) => (
        <Step
          key={step.id}
          expanded={expanded === true || expanded === step.order}
          onClick={() => select(step.order + 1)}
          sx={{
            "& .MuiStepLabel-root, & .MuiStepContent-root": {
              cursor: "pointer!important",
            },
            "& .MuiStepContent-root": { color: "text.secondary" },
          }}
        >
          <StepLabel className="font-medium">{step.title}</StepLabel>
          <StepContent {...content}>{step.subtitle}</StepContent>
        </Step>
      ))}
    </Stepper>
  );
}
