"use strict";
function stateOf(f) {
  const s = f.formState;
  return JSON.parse(
    JSON.stringify(
      {
        values: f.getValues(),
        dirty: s.dirtyFields,
        touched: s.touchedFields,
        errors: JSON.parse(
          JSON.stringify(s.errors, (k, v) => (k === "ref" ? undefined : v)),
        ),
        isDirty: s.isDirty,
        isValid: s.isValid,
        isSubmitting: s.isSubmitting,
        isSubmitted: s.isSubmitted,
        isSubmitSuccessful: s.isSubmitSuccessful,
        submitCount: s.submitCount,
      },
      (k, v) => (k === "ref" ? undefined : v),
    ),
  );
}
async function scenario(React, createRoot, api, zodResolver, z) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const h = React.createElement,
    act = React.act,
    host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  let f,
    fields = {},
    show = true,
    renderCount = 0;
  const snapshots = [];
  const defaults = {
    name: "",
    agree: false,
    event: { title: "Draft" },
    grade: "3",
  };
  const schema = z.object({
    name: z.string().min(2, "Name too short"),
    agree: z.boolean().refine(Boolean, "Consent required"),
    event: z.object({ title: z.string().min(1, "Title required") }),
    grade: z.string(),
  });
  function Form() {
    f = api.useForm({
      defaultValues: defaults,
      mode: "onChange",
      resolver: zodResolver(schema),
    });
    const s = stateOf(f);
    if (++renderCount > 150) throw Error("form render loop");
    return h(
      api.FormProvider,
      { ...f },
      h(
        "form",
        { onSubmit: f.handleSubmit(() => {}) },
        ...["name", "agree", "event.title"]
          .filter((n) => show || n !== "name")
          .map((name) =>
            h(api.Controller, {
              key: name,
              name,
              control: f.control,
              render: ({ field }) => {
                fields[name] = field;
                return h("input", {
                  ...field,
                  "data-field": name,
                  ...(name === "agree"
                    ? { type: "checkbox", checked: field.value }
                    : { value: field.value ?? "" }),
                });
              },
            }),
          ),
        h("output", null, JSON.stringify(s)),
      ),
    );
  }
  const snap = () => {
    snapshots.push({
      ...stateOf(f),
      dom: [...host.querySelectorAll("input")].map((n) => [
        n.name,
        n.type === "checkbox" ? n.checked : n.value,
      ]),
    });
  };
  await act(async () => root.render(h(React.StrictMode, null, h(Form))));
  snap();
  await act(async () => fields.name.onChange({ target: { value: "A" } }));
  snap();
  await act(async () => fields.name.onBlur());
  snap();
  await act(async () => fields.name.onChange("Alice"));
  snap();
  let step;
  await act(async () => {
    step = await f.trigger(["name"]);
  });
  snapshots.push({ step });
  snap();
  await act(async () =>
    f.setValue("event.title", "Contest", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    }),
  );
  snap();
  await act(async () =>
    fields.agree.onChange({ target: { type: "checkbox", checked: true } }),
  );
  snap();
  let release, submitted;
  const saving = new Promise((r) => (release = r));
  let pending;
  await act(async () => {
    pending = f.handleSubmit(async (v) => {
      submitted = v;
      await saving;
    })();
    await Promise.resolve();
  });
  snap();
  await act(async () => {
    release();
    await pending;
  });
  snapshots.push({ submitted });
  snap();
  await act(async () => {
    show = false;
    root.render(h(React.StrictMode, null, h(Form)));
  });
  snapshots.push({ unmountedName: f.getValues("name") });
  await act(async () => {
    show = true;
    root.render(h(React.StrictMode, null, h(Form)));
  });
  snap();
  await act(async () =>
    f.reset({
      name: "Reset",
      agree: false,
      event: { title: "Restored" },
      grade: "4",
    }),
  );
  snap();
  await act(async () =>
    f.setError("event.title", { type: "server", message: "Conflict" }),
  );
  snap();
  await act(async () => f.clearErrors("event.title"));
  snap();
  await act(async () => root.unmount());
  host.remove();
  // Native registrations and each validation mode use actual input event handlers.
  for (const mode of ["onSubmit", "onBlur", "onChange", "onTouched", "all"]) {
    const box = document.createElement("div");
    document.body.append(box);
    const nativeRoot = createRoot(box);
    let form, registration;
    function Native() {
      form = api.useForm({ mode, defaultValues: { title: "" } });
      registration = form.register("title", {
        required: "Required",
        minLength: { value: 2, message: "Too short" },
      });
      const state = stateOf(form);
      return h(
        "form",
        null,
        h("input", { ...registration }),
        h("output", null, JSON.stringify(state)),
      );
    }
    await act(async () =>
      nativeRoot.render(h(React.StrictMode, null, h(Native))),
    );
    const input = box.querySelector("input");
    const save = () =>
      snapshots.push({ mode, ...stateOf(form), dom: input.value });
    save();
    await act(async () => {
      input.value = "a";
      await registration.onChange({ target: input, type: "change" });
    });
    save();
    await act(async () => registration.onBlur({ target: input, type: "blur" }));
    save();
    await act(async () => {
      input.value = "okay";
      await registration.onChange({ target: input, type: "change" });
    });
    save();
    await act(async () => form.handleSubmit(() => {})());
    save();
    await act(async () => form.reset({ title: "Restored" }));
    save();
    await act(async () => nativeRoot.unmount());
    box.remove();
  }
  return snapshots;
}
module.exports = { scenario, stateOf };
