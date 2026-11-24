import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Popper from "@popper";
export function render(props) {
  return renderToStaticMarkup(
    <Popper {...props} className="z-9999">
      <section role="listbox">Contest results</section>
    </Popper>,
  );
}
// What a render-function child is handed, with and without a transition.
export function renderFunction(props) {
  return renderToStaticMarkup(
    <Popper {...props} className="z-9999">
      {(options) => (
        <section
          role="dialog"
          data-options={Object.keys(options).sort().join(" ")}
          data-placement={options.placement}
          data-in={String(options.TransitionProps?.in)}
          data-callbacks={[
            typeof options.TransitionProps?.onEnter,
            typeof options.TransitionProps?.onExited,
          ].join(" ")}
        >
          Contest results
        </section>
      )}
    </Popper>,
  );
}
