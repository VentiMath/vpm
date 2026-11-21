import React from "react";
import Grow from "@grow";
export function scene(props) {
  return (
    <Grow
      id="menu-fuse-list-grow"
      style={{ transformOrigin: "0 0 0" }}
      {...props}
    >
      <section className="rounded-sm">
        <ul>
          <li>Contests</li>
        </ul>
      </section>
    </Grow>
  );
}
