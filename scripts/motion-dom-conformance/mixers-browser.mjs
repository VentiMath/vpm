function check(value, message) {
  if (!value) throw Error(message);
}
export async function checkMixers(current, app, vpm) {
  const rows = [];
  for (const api of [current, app, vpm]) {
    const node = document.createElement("div");
    document.body.append(node);
    const values = {
      backgroundColor: api.interpolate([0, 1], ["#000", "#fff"]),
      boxShadow: api.mixComplex("0px 2px 4px #000", "10px 20px 30px #fff"),
      transform: api.mixComplex(
        "translateX(0px) rotate(0deg)",
        "translateX(20px) rotate(90deg)",
      ),
      filter: api.mixComplex(
        "blur(0px) brightness(100%)",
        "blur(10px) brightness(50%)",
      ),
    };
    const samples = [];
    for (const p of [0, 0.25, 0.5, 1]) {
      for (const key of Object.keys(values)) node.style[key] = values[key](p);
      const style = getComputedStyle(node);
      samples.push([
        style.backgroundColor,
        style.boxShadow,
        style.transform,
        style.filter,
      ]);
    }
    rows.push(samples);
    node.remove();
  }
  check(
    JSON.stringify(rows[0]) === JSON.stringify(rows[2]) &&
      JSON.stringify(rows[1]) === JSON.stringify(rows[2]),
    "computed CSS mixer samples differ",
  );
  const node = document.createElement("div");
  document.body.append(node);
  node.style.color = "rgb(100% 0% 50% / 25%)";
  const expected = getComputedStyle(node).color;
  node.style.color = vpm.color.transform(
    vpm.color.parse("rgb(100% 0% 50% / 25%)"),
  );
  check(
    getComputedStyle(node).color === expected,
    "CSS percentage normalization",
  );
  node.remove();
  for (const api of [current, vpm]) {
    const node = document.createElement("div");
    document.body.append(node);
    const owner = new current.HTMLVisualElement({
      props: { onUpdate: () => {} },
      presenceContext: null,
      visualState: {
        latestValues: {
          backgroundColor: "#000",
          boxShadow: "0px 2px 4px #000",
        },
        renderState: {
          style: {},
          vars: {},
          transform: {},
          transformOrigin: {},
        },
      },
    });
    owner.mount(node);
    const group = new api.GroupAnimation(
      api.animateTarget(owner, {
        backgroundColor: "#fff",
        boxShadow: "10px 20px 30px #fff",
        transition: { duration: 1, ease: "linear", autoplay: false },
      }),
    );
    group.time = 0.5;
    api.frameSteps.update.process({
      timestamp: 1000,
      delta: 16,
      isProcessing: true,
    });
    owner.render();
    check(
      getComputedStyle(node).backgroundColor === "rgb(180, 180, 180)",
      `renderer color midpoint ${api === vpm ? "vpm" : "upstream"}: ${getComputedStyle(node).backgroundColor}; value ${owner.getValue("backgroundColor").get()}`,
    );
    check(
      getComputedStyle(node).boxShadow.includes("5px 11px 17px"),
      "renderer shadow midpoint",
    );
    group.complete();
    await group.finished;
    owner.render();
    check(
      getComputedStyle(node).backgroundColor === "rgb(255, 255, 255)",
      "renderer color endpoint",
    );
    group.stop();
    owner.unmount();
    node.remove();
  }
}
