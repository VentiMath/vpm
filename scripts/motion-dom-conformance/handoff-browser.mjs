function assert(condition, message) {
  if (!condition) throw Error(message);
}
export async function checkHandoff(current, vpm) {
  for (const api of [current, vpm])
    for (const foreign of [false, true]) {
      const iframe = foreign ? document.createElement("iframe") : null;
      if (iframe) document.body.append(iframe);
      const doc = iframe ? iframe.contentDocument : document;
      const element = doc.createElement("div");
      element.style.opacity = ".2";
      doc.body.append(element);
      const owner = new current.HTMLVisualElement({
        props: {},
        presenceContext: null,
        visualState: {
          latestValues: {},
          renderState: {
            style: {},
            vars: {},
            transform: {},
            transformOrigin: {},
          },
        },
      });
      owner.mount(element);
      const value = api.motionValue(0.2);
      api.styleEffect([element], { opacity: value });
      // This is an unchanged upstream renderer receiving VPM values and controllers.
      const animation = api.animateSingleValue(value, 1, {
        duration: 1,
        ease: "linear",
        autoplay: false,
      });
      animation.time = 0.25;
      api.frameSteps.update.process({
        timestamp: 1000,
        delta: 16,
        isProcessing: true,
      });
      api.styleEffect.flush(element);
      api.handOffElementState(element, owner);
      assert(
        owner.getValue("opacity") === value,
        "handoff changed value identity",
      );
      assert(
        api.styleEffect.get(element, "opacity") === undefined,
        "source stayed attached",
      );
      animation.time = 0.75;
      api.frameSteps.update.process({
        timestamp: 1000,
        delta: 16,
        isProcessing: true,
      });
      owner.render();
      assert(
        Math.abs(Number(element.style.opacity) - 0.8) < 0.00001,
        "transferred animation did not render",
      );
      api.releaseElement(element);
      animation.time = 0.9;
      api.frameSteps.update.process({
        timestamp: 1000,
        delta: 16,
        isProcessing: true,
      });
      owner.render();
      assert(
        Math.abs(Number(element.style.opacity) - 0.92) < 0.00001,
        "source release stopped destination",
      );
      animation.stop();
      const next = api.animateElement(
        element,
        { opacity: [0.2, 1], x: [0, 40] },
        { duration: 1, ease: "linear", autoplay: false },
        owner,
      );
      // Some upstream direct iframe helpers depend on their realm. VPM deliberately
      // accepts the owner-document element without constructor-global checks.
      for (const animation of next) animation.time = 0.5;
      api.frameSteps.update.process({
        timestamp: 1000,
        delta: 16,
        isProcessing: true,
      });
      owner.render();
      assert(
        Math.abs(Number(doc.defaultView.getComputedStyle(element).opacity) - 0.6) < 0.00001,
        `renderer-owned element fade: ${api===vpm?"vpm":"current"} iframe=${foreign} style=${element.style.opacity} computed=${getComputedStyle(element).opacity} value=${owner.getValue("opacity").get()}`,
      );
      assert(
        api.styleEffect.get(element, "opacity") === undefined,
        "second renderer attached",
      );
      for (const key of ["opacity", "x"]) owner.getValue(key)?.stop();
      owner.unmount();
      element.remove();
      iframe?.remove();
    }
  // SVG transfers use the same unchanged renderer on actual browser nodes.
  for (const api of [current, vpm]) {
    const element = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    document.body.append(element);
    const owner = new current.SVGVisualElement({
      props: {},
      presenceContext: null,
      visualState: {
        latestValues: {},
        renderState: {
          style: {},
          vars: {},
          transform: {},
          transformOrigin: {},
          attrs: {},
        },
      },
    });
    owner.mount(element);
    const value = api.motionValue(0.3);
    api.svgEffect([element], { opacity: value });
    api.handOffElementState(element, owner);
    value.set(0.7);
    owner.render();
    assert(owner.getValue("opacity") === value, "SVG identity");
    assert(Number(element.style.opacity) === 0.7, "SVG renderer paint");
    assert(
      api.svgEffect.get(element, "opacity") === undefined,
      "SVG source remained",
    );
    owner.unmount();
    element.remove();
  }
}
