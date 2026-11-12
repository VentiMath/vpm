"use strict";
const assert = require("node:assert/strict");
module.exports = async function (React, createRoot, api) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host),
    h = React.createElement,
    act = React.act;
  let f,
    props = { values: { nested: { title: "First" } }, disabled: false },
    show = true;
  function Form() {
    f = api.useForm({ ...props, shouldUnregister: true });
    return show
      ? h(api.Controller, {
          name: "nested.title",
          control: f.control,
          render: ({ field }) => h("input", field),
        })
      : null;
  }
  const render = () => root.render(h(React.StrictMode, null, h(Form)));
  try {
    await act(async () => render());
    assert.equal(host.querySelector("input").value, "First");
    assert.equal(f.getValues("nested.title"), "First");
    await act(async () => {
      props = {
        ...props,
        values: { nested: { title: "Second" } },
        disabled: true,
      };
      render();
    });
    assert.equal(host.querySelector("input").value, "Second");
    assert.equal(host.querySelector("input").disabled, true);
    await act(async () => {
      props = {
        ...props,
        errors: { nested: { title: { type: "server", message: "Conflict" } } },
      };
      render();
    });
    assert.equal(f.getFieldState("nested.title").error.message, "Conflict");
    await act(async () => {
      props = { ...props, errors: {}, disabled: false };
      render();
    });
    assert.equal(f.getFieldState("nested.title").error, undefined);
    await act(async () => {
      show = false;
      render();
    });
    assert.equal(f.getValues("nested.title"), undefined);
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
};

const reactive = module.exports;
module.exports = async function (React, createRoot, api) {
  await reactive(React, createRoot, api);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host),
    h = React.createElement,
    act = React.act,
    counts = {};
  let f;
  function Form() {
    f = api.useForm({ defaultValues: { a: "A", b: "B" } });
    return h(
      "form",
      { "data-dirty": f.formState.isDirty },
      ...["a", "b"].map((name) =>
        h(api.Controller, {
          key: name,
          control: f.control,
          name,
          render: ({ field }) => {
            counts[name] = (counts[name] || 0) + 1;
            return h("input", field);
          },
        }),
      ),
    );
  }
  try {
    await act(async () => root.render(h(Form)));
    await act(async () => f.setValue("a", "Changed", { shouldDirty: true }));
    const before = counts.b,
      node = host.querySelector('[name="b"]');
    node.focus();
    await act(async () => f.setValue("a", "Again", { shouldDirty: true }));
    assert.equal(
      counts.b,
      before,
      "unrelated controlled inputs must not rerender",
    );
    assert.equal(document.activeElement, node);
    assert.equal(host.querySelector('[name="a"]').value, "Again");
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
};
