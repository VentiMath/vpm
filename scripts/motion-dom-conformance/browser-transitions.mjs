export async function checkTransitions(apis) {
  for (const api of apis) {
    const node = document.createElement("div");
    document.body.append(node);
    const scale = api.motionValue(0),
      opacity = api.motionValue(0),
      seen = [];
    const detach = api.styleEffect(node, { scale, opacity });
    const off = scale.on("change", (x) => seen.push(x));
    await Promise.all([
      scale.start(api.animateMotionValue("scale", scale, 1, { delay: 0.03 })),
      opacity.start(
        api.animateMotionValue("opacity", opacity, [null, 1], {
          duration: 0.08,
          ease: "linear",
        }),
      ),
    ]);
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    if (
      getComputedStyle(node).opacity !== "1" ||
      !["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(
        getComputedStyle(node).transform,
      )
    )
      throw Error(
        "transition adapter failed to paint the calendar/fade endpoint",
      );
    if (!seen.some((x) => x > 0 && x < 1))
      throw Error("scale transition did not animate");
    const animation = api.animateMotionValue("opacity", opacity, 0, {
      duration: 1,
    })(() => {
      throw Error("cancelled transition completed");
    });
    await new Promise(requestAnimationFrame);
    animation.stop();
    const stopped = opacity.get();
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    if (opacity.get() !== stopped)
      throw Error("cancelled transition kept updating");
    detach();
    off();
    node.remove();
  }
}
