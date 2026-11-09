export async function checkReads(apis) {
  const [current, app, vpm] = apis;
  const eq = (a, b, label) => {
    if (JSON.stringify(a) !== JSON.stringify(b))
      throw Error(
        label + ": " + JSON.stringify(a) + " != " + JSON.stringify(b),
      );
  };
  const near = (a, b, label) => {
    if (Math.abs(a - b) > 0.01) throw Error(label + ": " + a + " != " + b);
  };
  const parent = document.createElement("div");
  parent.style.cssText = "width:400px;height:200px;position:relative";
  document.body.append(parent);
  const make = () => {
    const n = document.createElement("div");
    n.style.cssText =
      "width:20px;height:30px;box-sizing:border-box;opacity:.4;position:relative;--target:80px";
    parent.append(n);
    return n;
  };
  const nodes = [];
  function resolve(api, node, name, frames) {
    let result;
    const value = api.motionValue(undefined),
      values = new Map([[name, value]]);
    const el = {
      current: node,
      readValue: (key) => current.readStyleValue(node, key),
      getValue: (key) => values.get(key),
      render() {
        for (const [key, val] of values)
          if (val.get() !== undefined)
            node.style[key] =
              typeof val.get() === "number" ? val.get() + "px" : val.get();
      },
      measureViewportBox() {
        const r = node.getBoundingClientRect();
        return {
          x: { min: r.left, max: r.right },
          y: { min: r.top, max: r.bottom },
        };
      },
    };
    const resolver = new api.DOMKeyframesResolver(
      frames,
      (...args) => (result = args),
      name,
      value,
      el,
    );
    resolver.scheduleResolve();
    api.flushKeyframeResolvers();
    return { result, resolver };
  }
  try {
    const node = make();
    nodes.push(node);
    node.style.transform = "translate(12px, 24px) scale(2)";
    for (const key of [
      "opacity",
      "width",
      "height",
      "--target",
      "x",
      "y",
      "scale",
      "scaleX",
      "scaleY",
    ])
      eq(
        vpm.readStyleValue(node, key),
        current.readStyleValue(node, key),
        "style " + key,
      );
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"),
      path = document.createElementNS(svg.namespaceURI, "path");
    svg.append(path);
    parent.append(svg);
    nodes.push(svg);
    path.setAttribute("stroke-width", "4");
    path.setAttribute("viewBox", "0 0 10 10");
    path.style.strokeWidth = "6px";
    path.style.opacity = ".3";
    for (const key of [
      "strokeWidth",
      "viewBox",
      "opacity",
      "pathLength",
      "x",
      "scale",
      "missing",
    ])
      eq(
        vpm.readSVGValue(path, key),
        current.readSVGValue(path, key),
        "SVG " + key,
      );
    node.style.transform = "rotate(90deg) scale(2)";
    near(vpm.readTransformValue(node, "scale"), 2, "rotation-preserved scale");
    near(
      current.readTransformValue(node, "scale"),
      0,
      "upstream rotated scale reproduction",
    );
    for (const name of ["width", "height", "opacity", "x"])
      for (const frames of [
        [null, 1],
        [0, "20px"],
        [null, "var(--target)"],
      ]) {
        const rows = apis.map(
          (api) => resolve(api, make(), name, frames).result,
        );
        for (const row of rows)
          if (!row) throw Error("missing resolver callback");
        // Public numeric strings are normalized by VPM; compare their numeric values.
        eq(
          rows[2][0].map((x) => parseFloat(x)),
          rows[0][0].map((x) => parseFloat(x)),
          "resolved " + name + JSON.stringify(frames),
        );
        eq(rows[2][1], rows[0][1], "final token");
      }
    for (const frames of [
      [null, "50%"],
      [null, "auto"],
      ["20px", "auto"],
    ]) {
      const node = make(),
        before = node.style.cssText;
      const { result } = resolve(vpm, node, "width", frames);
      eq(
        result[0],
        [20, frames.at(-1) === "50%" ? 200 : 400],
        "measured width",
      );
      eq(node.style.cssText, before, "style restoration");
      const control = resolve(current, make(), "width", frames).result;
      eq(result[0], control[0], "upstream measured width");
    }
    const explicit = make(),
      before = explicit.style.cssText;
    eq(
      resolve(vpm, explicit, "width", ["10%", "auto"]).result[0],
      [40, 400],
      "explicit measured starting point",
    );
    eq(explicit.style.cssText, before, "explicit start restored");
    const translate = make();
    translate.style.width = "100px";
    translate.style.transform = "translateX(10px) scale(2)";
    eq(
      resolve(vpm, translate, "x", [null, "50%"]).result[0],
      [10, 50],
      "untransformed translation basis",
    );
    const iframe = document.createElement("iframe");
    parent.append(iframe);
    await new Promise((r) => {
      if (iframe.contentDocument.readyState === "complete") r();
      else iframe.onload = r;
    });
    const foreign = iframe.contentDocument.createElement("div");
    foreign.style.cssText = "width:27px;opacity:.7;transform:translateX(9px)";
    iframe.contentDocument.body.append(foreign);
    eq(vpm.readStyleValue(foreign, "width"), "27px", "iframe width");
    eq(vpm.readStyleValue(foreign, "x"), 9, "iframe transform");
    return {
      style: true,
      svg: true,
      variables: true,
      measurement: true,
      restoration: true,
      iframe: true,
    };
  } finally {
    parent.remove();
  }
}
