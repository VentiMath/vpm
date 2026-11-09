function check(value, message) {
  if (!value) throw Error(message);
}
export async function checkRendererAnimations(current, vpm) {
  for (const api of [current, vpm]) {
    const parent = document.createElement("div");
    parent.style.width = "400px";
    document.body.append(parent);
    const e = document.createElement("div");
    e.style.width = "100px";
    e.style.setProperty("--end", "200px");
    parent.append(e);
    const owner = new current.HTMLVisualElement({
      props: { onUpdate: () => {} },
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
    owner.mount(e);
    for (const target of ["var(--end)", "50%", "auto"]) {
      e.style.width = "100px";
      const value = api.motionValue("100px");
      owner.addValue("width", value);
      const finished = value.start(
        api.animateMotionValue(
          "width",
          value,
          target,
          { duration: 1, ease: "linear", autoplay: false },
          owner,
        ),
      );
      const animation = value.animation;
      animation.time = 0.5;
      api.frameSteps.update.process({
        timestamp: 1000,
        delta: 16,
        isProcessing: true,
      });
      owner.render();
      const expected = target === "auto" ? 250 : 150;
      check(
        Math.abs(e.getBoundingClientRect().width - expected) < 0.1,
        `renderer ${api === vpm ? "vpm" : "current"} ${target} width ${e.style.width}`,
      );
      animation.complete();
      await finished;
      owner.render();
      check(
        e.style.width === target,
        `responsive endpoint ${target}: ${e.style.width}`,
      );
    }
    owner.unmount();
    parent.remove();
    // A subclass uses the public protected keyframe state, never DOM internals.
    let reads = 0;
    class Custom extends api.KeyframeResolver {
      readKeyframes() {
        reads++;
        this.unresolvedKeyframes = this.unresolvedKeyframes.map((v) =>
          v === "token" ? 40 : v,
        );
        super.readKeyframes();
      }
    }
    const value = api.motionValue(0),
      element = { current: {}, getProps: () => ({}), KeyframeResolver: Custom };
    const done = value.start(
      api.animateMotionValue(
        "x",
        value,
        "token",
        { duration: 0.02, ease: "linear" },
        element,
      ),
    );
    await done;
    check(value.get() === 40 && reads === 1, "custom frame-driven resolution");
  }
}
