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
