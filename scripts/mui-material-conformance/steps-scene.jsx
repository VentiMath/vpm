import React from "react";
import Stepper from "@form-stepper";
import Step from "@form-step";
import StepLabel from "@form-step-label";
const student = [
  "About You",
  "Student Info",
  "Parent/Guardian",
  "Competition",
  "T-Shirt",
  "Confirm",
];
const parent = [
  "About You",
  "Contact Info",
  "Student Info",
  ...student.slice(3),
];
const volunteer = ["About You", "Contact Info", "Confirm"];
export function labels(role) {
  return role === "parent"
    ? parent
    : role === "volunteer" || role === "other"
      ? volunteer
      : student;
}
export function scene({
  role = "student",
  activeStep = 0,
  stepper,
  step,
  label,
  original = false,
} = {}) {
  if (original && typeof window !== "undefined" && window.registrationSteps)
    return window.registrationSteps(
      React,
      Stepper,
      Step,
      StepLabel,
      role,
      activeStep,
    );
  return (
    <Stepper
      alternativeLabel
      activeStep={activeStep}
      sx={{ mb: 3 }}
      {...stepper}
    >
      {labels(role).map((name, i) => (
        <Step key={name} {...step?.(i)}>
          <StepLabel {...label?.(i)}>{name}</StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}
