export async function checkEffects(apis) {
  const tick = () => new Promise(requestAnimationFrame);
  const rows = [];
  for (const [index, api] of apis.entries()) {
    const host = document.createElement("div");
    host.className = "effect-fixture-" + index;
    document.body.append(host);
    const box = document.createElement("div");
    host.append(box);
    box.style.cssText = "width:20px;height:20px;background:red";
    const x = api.motionValue(0),
      scale = api.motionValue(0),
      opacity = api.motionValue(0);
    const off = api.styleEffect(".effect-fixture-" + index + " > div", {
      x,
      scale,
      opacity,
      "--progress": opacity,
    });
    x.set(10);
    scale.set(0.5);
    opacity.set(0.6);
    await tick();
    const first = {
      transform: box.style.transform,
      opacity: box.style.opacity,
      variable: box.style.getPropertyValue("--progress"),
      computed: getComputedStyle(box).transform,
    };
    const attrs = api.attrEffect(box, {
      ariaLabel: api.motionValue("animated"),
      dataProgress: opacity,
    });
    await tick();
    const attributes = [
      box.getAttribute("aria-label"),
      box.getAttribute("data-progress"),
    ];
    // Real calendar default spring: an actual style binding writes each frame.
    const animation = api.animateValue({
      keyframes: [0.5, 1],
      type: "spring",
      stiffness: 550,
      damping: 30,
      restSpeed: 10,
      onUpdate: (v) => scale.set(v),
    });
    await animation.finished;
    await tick();
    const final = getComputedStyle(box).transform;
    off();
    attrs();
    scale.set(5);
    opacity.set(1);
    await tick();
    if (
      getComputedStyle(box).transform !== final ||
      (box.style.opacity !== ".6" && box.style.opacity !== "0.6")
    )
      throw Error("effect cleanup wrote a detached binding");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"),
      path = document.createElementNS(svg.namespaceURI, "path");
    svg.append(path);
    host.append(svg);
    path.setAttribute("d", "M0 0 L100 0");
    const svgOff = api.svgEffect(path, {
      pathLength: api.motionValue(0.5),
      pathOffset: api.motionValue(0.25),
      stroke: api.motionValue("red"),
      strokeWidth: api.motionValue(2),
      attrWidth: api.motionValue(10),
    });
    await tick();
    const vector = {
      stroke: getComputedStyle(path).stroke,
      width: path.getAttribute("width"),
      length: path.getAttribute("pathLength"),
      dashes: path.getAttribute("stroke-dasharray"),
      offset: path.getAttribute("stroke-dashoffset"),
    };
    svgOff();
    // An element from another realm must work without instanceof the outer window.
    const iframe = document.createElement("iframe");
    host.append(iframe);
    const other = iframe.contentDocument.createElement("div");
    iframe.contentDocument.body.append(other);
    const otherOff = api.styleEffect(other, { opacity: api.motionValue(0.4) });
    await tick();
    const directOpacity = other.style.opacity;
    otherOff();
    if (directOpacity !== (index === 2 ? "0.4" : ""))
      throw Error("cross-window direct-element behavior changed");
    const wrappedOff = api.styleEffect([other], {
      opacity: api.motionValue(0.4),
    });
    await tick();
    const iframeOpacity = other.style.opacity;
    wrappedOff();
    rows.push({ first, attributes, final, vector, iframeOpacity });
    host.remove();
  }
  if (
    JSON.stringify(rows[0]) !== JSON.stringify(rows[2]) ||
    JSON.stringify(rows[1]) !== JSON.stringify(rows[2])
  )
    throw Error("DOM effect browser control mismatch: " + JSON.stringify(rows));
  const api = apis[2],
    e = document.createElement("div");
  document.body.append(e);
  const a = api.motionValue(1),
    b = api.motionValue(2),
    offA = api.styleEffect(e, { x: a }),
    offB = api.styleEffect(e, { y: b });
  await tick();
  const replacement = api.styleEffect(e, { x: b });
  offA();
  b.set(3);
  await tick();
  if (e.style.transform !== "translateX(3px) translateY(3px)")
    throw Error("stale cleanup removed replacement");
  api.releaseElement(e);
  offB();
  replacement();
  const fresh = api.styleEffect(e, { scale: api.motionValue(2) });
  await tick();
  if (e.style.transform !== "scale(2)")
    throw Error("release retained old transforms");
  fresh();
  e.remove();
  return rows;
}
