export async function checkElements(current, vpm) {
  const assert = (condition, label) => {
    if (!condition) throw Error(label);
  };
  const near = (a, b, label) =>
    assert(
      Math.abs(Number(a) - Number(b)) < 0.001,
      label + ": " + a + " / " + b,
    );
  const parent = document.createElement("div");
  parent.style.cssText = "width:400px;height:100px;position:relative";
  document.body.append(parent);
  const make = (doc = document) => {
    const e = doc.createElement("div");
    e.style.cssText = "width:20px;height:20px;opacity:.2;--size:80px";
    (doc === document ? parent : doc.body).append(e);
    return e;
  };
  try {
    for (const api of [current, vpm]) {
      const e = make();
      const controls = api.animateElement(
        e,
        { opacity: 1, x: 30, scale: [0.5, 1] },
        { duration: 0.06, ease: "linear", scale: {type:"spring",stiffness:550,damping:30,restSpeed:10} },
      );
      await Promise.all(controls.map((a) => a.finished));
      await new Promise(requestAnimationFrame);
      near(getComputedStyle(e).opacity, 1, "finished opacity");
      const m = new DOMMatrix(getComputedStyle(e).transform);
      near(m.m41, 30, "translation");
      near(m.a, 1, "scale");
      api.releaseElement(e);
      e.remove();
      for (const target of ["var(--size)", "50%", "auto"]) {
        const n = make(),
          a = api.animateElement(
            n,
            { width: target },
            { duration: 0.05, ease: "linear" },
          );
        await Promise.all(a.map((c) => c.finished));
        await new Promise(requestAnimationFrame);
        near(
          n.getBoundingClientRect().width,
          target === "var(--size)" ? 80 : target === "50%" ? 200 : 400,
          "measured width " + target,
        );
        assert(
          n.style.width === target,
          "retain responsive endpoint " + target,
        );
        api.releaseElement(n);
        n.remove();
      }
    }
    for (const api of [current, vpm]) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const rect = document.createElementNS(svg.namespaceURI, "rect");
      rect.setAttribute("width", "10");
      rect.setAttribute("height", "10");
      svg.append(rect);
      parent.append(svg);
      await Promise.all(
        api
          .animateElement(
            rect,
            { attrX: [0, 40], pathLength: [0, 1] },
            { duration: 0.05, ease: "linear" },
          )
          .map((a) => a.finished),
      );
      await new Promise(requestAnimationFrame);
      near(rect.x.baseVal.value, 40, "SVG attribute animation");
      assert(
        rect.getAttribute("stroke-dasharray") === "1 0",
        "SVG path drawing endpoint",
      );
      api.releaseElement(rect);
      svg.remove();
    }
    // Forced seek snapshots compare JS delivery after upstream's queued write.
    for (const frames of [
      { opacity: [0, 1] },
      { x: [0, 100] },
      { "--offset": ["0%", "100%"] },
    ]) {
      const rows = [];
      for (const api of [current, vpm]) {
        const e = make(),
          a = api.animateElement(e, frames, {
            duration: 1,
            delay: 0.2,
            ease: "linear",
            autoplay: false,
          })[0];
        a.time = 0.7;
        api.frameSteps.update.process({
          timestamp: performance.now(),
          delta: 16,
          isProcessing: true,
        });
        api.styleEffect.flush(e);
        const key = Object.keys(frames)[0];
        rows.push(parseFloat(api.styleEffect.get(e, key).get()));
        api.releaseElement(e);
        e.remove();
      }
      near(rows[0], rows[1], "delayed seek");
    }
    const iframe = document.createElement("iframe");
    parent.append(iframe);
    const el = make(iframe.contentDocument);
    await Promise.all(
      vpm
        .animateElement(el, { opacity: 1 }, { duration: 0.05 })
        .map((a) => a.finished),
    );
    await new Promise(requestAnimationFrame);
    near(iframe.contentWindow.getComputedStyle(el).opacity, 1, "iframe paint");
    vpm.releaseElement(el);
    iframe.remove();
    const cancelled = make(),
      [a] = vpm.animateElement(cancelled, { width: "50%" }, { duration: 0.05 });
    vpm.releaseElement(cancelled);
    await a.finished;
    await new Promise(requestAnimationFrame);
    assert(
      cancelled.style.width === "20px",
      "release cancels pending layout animation",
    );
    cancelled.remove();
  } finally {
    parent.remove();
  }
}
