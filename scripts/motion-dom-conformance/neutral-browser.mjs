function check(value, message) {
  if (!value) throw Error(message);
}
export async function checkNeutral(vpm) {
  for (const [key, end] of [
    ["filter", "brightness(.5) blur(10px)"],
    ["filter", "drop-shadow(10px 20px 4px rgb(255, 0, 0))"],
    ["backdropFilter", "contrast(20%)"],
    ["transform", "translateX(20px) scale(2)"],
    ["boxShadow", "10px 20px 4px rgb(255, 0, 0)"],
  ]) {
    const node = document.createElement("div"),
      control = document.createElement("div");
    node.style[key] = "none";
    control.style[key] = "none";
    document.body.append(node, control);
    const animation = control.animate([{ [key]: "none" }, { [key]: end }], {
      duration: 1000,
      easing: "linear",
      fill: "both",
    });
    animation.pause();
    animation.currentTime = 500;
    const [handle] = vpm.animateElement(
      node,
      { [key]: ["none", end] },
      { duration: 1, ease: "linear", autoplay: false },
    );
    handle.time = 0.5;
    vpm.styleEffect.flush(node);
    await new Promise(requestAnimationFrame);
    check(
      getComputedStyle(node)[key] === getComputedStyle(control)[key],
      `${key}: ${getComputedStyle(node)[key]} != native ${getComputedStyle(control)[key]}`,
    );
    handle.stop();
    animation.cancel();
    vpm.releaseElement(node);
    node.remove();
    control.remove();
  }
  const node = document.createElement("div");
  node.style.filter = "none";
  node.style.color = "rgb(10, 20, 30)";
  document.body.append(node);
  const [a] = vpm.animateElement(
    node,
    { filter: ["none", "drop-shadow(2px 4px 3px)"] },
    { duration: 1, ease: "linear", autoplay: false },
  );
  a.time = 0.5;
  vpm.styleEffect.flush(node);
  check(
    getComputedStyle(node).filter.includes("rgba(10, 20, 30, 0.5)"),
    `current DOM shadow color: ${getComputedStyle(node).filter}`,
  );
  a.stop();
  node.style.filter = "none";
  node.style.color = "rgb(40, 50, 60)";
  const [b] = vpm.animateElement(
    node,
    { filter: ["none", "drop-shadow(2px 4px 3px)"] },
    { duration: 1, ease: "linear", autoplay: false },
  );
  b.time = 0.5;
  vpm.styleEffect.flush(node);
  check(
    getComputedStyle(node).filter.includes("rgba(40, 50, 60, 0.5)"),
    "computed colors must not be cached",
  );
  b.stop();
  const [c] = vpm.animateElement(
    node,
    { filter: ["blur(10px)", "none"] },
    { duration: 1, ease: "linear", autoplay: false },
  );
  c.complete();
  await c.finished;
  vpm.styleEffect.flush(node);
  check(getComputedStyle(node).filter === "none", "literal final none");
  c.stop();
  vpm.releaseElement(node);
  node.remove();
}
