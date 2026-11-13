import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { Scene } from "./scene.jsx";
import { ButtonBase, Button } from "@buttons";
const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host);
window.renderCase = (props = {}) => root.render(<Scene {...props} />);
window.renderCase();
window.checkHydration = async (html) => {
  const el = document.createElement("div");
  el.innerHTML = html;
  document.body.append(el);
  const before = el.querySelector("button"),
    errors = [];
  const r = hydrateRoot(el, <Button disableRipple>Hydrated</Button>, {
    onRecoverableError: (e) => errors.push(e.message),
  });
  await new Promise((r) => setTimeout(r, 40));
  const result = { same: before === el.querySelector("button"), errors };
  r.unmount();
  el.remove();
  return result;
};
window.checkRipple = async () => {
  const el = document.createElement("div");
  document.body.append(el);
  const r = createRoot(el);
  r.render(
    <ButtonBase id="ripple" disableRipple={false}>
      Ripple
    </ButtonBase>,
  );
  await new Promise((r) => setTimeout(r, 30));
  const button = el.querySelector("button");
  button.dispatchEvent(
    new MouseEvent("mousedown", { bubbles: true, clientX: 5, clientY: 5 }),
  );
  await new Promise((r) => setTimeout(r, 30));
  const visible =
    el.querySelectorAll(".MuiTouchRipple-rippleVisible").length > 0;
  button.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  r.unmount();
  el.remove();
  return visible;
};
