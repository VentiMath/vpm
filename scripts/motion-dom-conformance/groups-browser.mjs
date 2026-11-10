function check(value, message) {
  if (!value) throw Error(message);
}
export async function checkGroups(current, vpm) {
  for (const api of [current, vpm]) {
    const node = document.createElement("div");
    node.style.display = "flex";
    document.body.append(node);
    const owner = new current.HTMLVisualElement({
      props: { onUpdate: () => {} },
      presenceContext: null,
      visualState: {
        latestValues: { opacity: 1, x: 0 },
        renderState: {
          style: {},
          vars: {},
          transform: {},
          transformOrigin: {},
        },
      },
    });
    owner.mount(node);
    const controls = api.animateTarget(owner, {
      opacity: 0,
      x: 30,
      transition: { duration: 0.03, ease: "linear" },
      transitionEnd: { display: "none" },
    });
    const group = new api.GroupAnimation(controls);
    owner.render();
    check(
      getComputedStyle(node).display === "flex",
      "end-only style preserved before completion",
    );
    await group.finished;
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    owner.render();
    check(
      getComputedStyle(node).display === "none",
      `target end display ${api === vpm ? "vpm" : "current"}`,
    );
    check(owner.getValue("x").get() === 30, "group transform endpoint");
    check(owner.getValue("opacity").get() === 0, "group opacity endpoint");
    group.stop();
    owner.unmount();
    node.remove();
  }
  const node = document.createElement("div");
  document.body.append(node);
  const values = { opacity: vpm.motionValue(1), x: vpm.motionValue(0) },
    off = vpm.styleEffect(node, values);
  const group = new vpm.GroupAnimation(
    vpm.animateValues(
      (k) => values[k],
      { opacity: [1, 0], x: [0, 50] },
      { duration: 1, autoplay: false, ease: "linear" },
    ),
  );
  group.time = 0.5;
  vpm.styleEffect.flush(node);
  check(getComputedStyle(node).opacity === "0.5", "group seek painted");
  group.cancel();
  vpm.styleEffect.flush(node);
  check(getComputedStyle(node).opacity === "1", "group cancel restored");
  group.stop();
  off();
  node.remove();
}
