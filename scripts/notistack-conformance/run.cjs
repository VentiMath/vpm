"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path");
require("node:child_process").execFileSync(
  "bun",
  [path.join(__dirname, "build.cjs")],
  { stdio: "inherit" },
);
for (const name of ["upstream", "vpm"]) {
  const { api, React, renderToStaticMarkup: render } = require(
    "./node_modules/.vpm-notistack/" + name + "/api.cjs",
  );
  const h = React.createElement;
  function Child() {
    assert.equal(typeof api.useSnackbar().enqueueSnackbar, "function");
    return h("button", null, "Notify");
  }
  assert.equal(
    render(
      h(
        api.SnackbarProvider,
        {
          maxSnack: 5,
          anchorOrigin: { vertical: "bottom", horizontal: "right" },
        },
        h(Child),
      ),
    ),
    "<button>Notify</button>",
  );
  if (name === 'vpm') {
    assert.throws(() => render(h(api.SnackbarProvider, {maxSnack:0}, 'child')), /maxSnack/);
    assert.throws(() => render(h(api.SnackbarProvider, {TransitionComponent:Child}, 'child')), /transition/);
  }
  for (const variant of ["default", "success", "error", "warning", "info"]) {
    const html = render(
      h(api.MaterialDesignContent, {
        id: variant,
        message: "<script>notify</script>",
        variant,
        iconVariant: {},
        hideIconVariant: true,
        action: (id) => h("button", null, "Dismiss " + id),
      }),
    );
    assert.ok(html.includes("&lt;script&gt;notify&lt;/script&gt;"));
    assert.ok(html.includes('role="alert"'));
    assert.ok(html.includes("Dismiss " + variant));
  }
}
console.log(
  "SSR provider/context, five notification variants, action keys and escaped messages pass on both controls.",
);
