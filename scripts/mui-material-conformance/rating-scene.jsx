import React from "react";
import { Rating } from "@buttons";
export function RatingScene({
  rows = 1,
  value = 0,
  interactive = false,
  uncontrolled = false,
  onPick,
  onPreview,
  ...props
}) {
  const [prefs, setPrefs] = React.useState({});
  return (
    <form>
      {Array.from({ length: rows }, (_, row) => (
        <Rating
          key={row}
          size="small"
          max={5}
          {...(uncontrolled
            ? { defaultValue: value }
            : { value: interactive ? (prefs[row] ?? value) : value })}
          onChange={(_, n) => {
            onPick?.(row, n);
            if (interactive) setPrefs((p) => ({ ...p, [row]: n ?? 0 }));
          }}
          onChangeActive={(_, n) => onPreview?.(row, n)}
          {...props}
        />
      ))}
    </form>
  );
}
export function HydrationScene() {
  return <RatingScene rows={2} value={2} />;
}
