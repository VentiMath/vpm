import React from "react";
import { renderToString } from "react-dom/server";
import ClickAwayListener from "@click-away";

export function prepare(kind) {
  const child =
    kind === "search" ? (
      <section aria-label="Search">
        <input type="search" />
      </section>
    ) : (
      <nav aria-label="Sidebar">
        <a href="/contests">Contests</a>
      </nav>
    );
  const element = (
    <ClickAwayListener onClickAway={() => {}}>{child}</ClickAwayListener>
  );
  return () => renderToString(element);
}
