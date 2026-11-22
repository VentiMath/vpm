import React from "react";
import Slider from "@font-slider";
export const marks = Array.from({ length: 7 }, (_, i) => ({
  value: 16 * ((i + 7) / 10),
  label: 70 + i * 10 + "%",
}));
export const settings = {
  min: marks[0].value,
  max: marks.at(-1).value,
  marks,
  step: null,
  track: false,
  valueLabelDisplay: "off",
  "aria-labelledby": "discrete-slider-small-steps",
  classes: { markLabel: "text-md font-semibold" },
};
export function scene(props) {
  return <Slider {...settings} {...props} />;
}
