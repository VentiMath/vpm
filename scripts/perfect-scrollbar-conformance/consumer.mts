import PerfectScrollbar, { type Options } from "vperfect-scrollbar";
import * as React from "react";
const options: Options = { wheelPropagation: true, suppressScrollX: true };
const ref = React.createRef<HTMLDivElement>();
if (ref.current) {
  const p = new PerfectScrollbar(ref.current, options);
  const alive: boolean = p.isAlive;
  p.update();
  p.destroy();
}
const p = new PerfectScrollbar("#scroll", {
  handlers: ["wheel", "keyboard", "drag-thumb", "click-rail"],
  minScrollbarLength: 20,
});
const reach: "start" | "end" | null = p.reach.y;
// @ts-expect-error touch inertia is outside the desktop contract
new PerfectScrollbar("#scroll", { swipeEasing: true });
// @ts-expect-error unsupported handler
new PerfectScrollbar("#scroll", { handlers: ["touch"] });
