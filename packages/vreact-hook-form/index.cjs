"use strict";
const React = require("react");
const { createFormControl, get, set, appendErrors } = require("./store.cjs");
const { equal, clone, related } = require("./paths.cjs");
const Context = React.createContext(null);
function useFormContext() {
  const value = React.useContext(Context);
  if (!value) throw new Error("a form control or FormProvider is required");
  return value;
}
function FormProvider({ children, ...methods }) {
  return React.createElement(Context.Provider, { value: methods }, children);
}
// Each hook observes only its field and the form-state properties it reads.
// Cache by store revision so React can safely call getSnapshot repeatedly.
function useSelection(control, identity, extra, fieldName) {
  const extraRef = React.useRef(extra);
  extraRef.current = extra;
  const selection = React.useMemo(() => {
    const keys = new Set();
    let snapshot,
      revision = -1,
      size = -1;
    const state = new Proxy(
      {},
      {
        get(_, key) {
          if (typeof key === "string") keys.add(key);
          return control._state()[key];
        },
        ownKeys() {
          return Reflect.ownKeys(control._state());
        },
        getOwnPropertyDescriptor(_, key) {
          return Object.hasOwn(control._state(), key)
            ? { enumerable: true, configurable: true }
            : undefined;
        },
        has(_, key) {
          return key in control._state();
        },
      },
    );
    const read = () => {
      const next = control._version();
      if (snapshot && revision === next && size === keys.size) return snapshot;
      const raw = control._state(),
        values = [extraRef.current?.(), ...Array.from(keys, (key) => raw[key])];
      if (!snapshot || !equal(snapshot.values, values))
        snapshot = { values: clone(values) };
      revision = next;
      size = keys.size;
      return snapshot;
    };
    const subscribe = (listener) =>
      control._subscribe((names) => {
        if (
          fieldName &&
          names.length &&
          !names.some((name) => related(name, fieldName)) &&
          snapshot &&
          size === keys.size
        ) {
          const raw = control._state();
          let index = 1,
            changed = false;
          for (const key of keys)
            if (!equal(snapshot.values[index++], raw[key])) {
              changed = true;
              break;
            }
          if (!changed) return;
        }
        listener();
      });
    return { state, read, subscribe };
  }, [control, identity]);
  React.useSyncExternalStore(
    selection.subscribe,
    selection.read,
    selection.read,
  );
  return selection;
}
function useForm(options = {}) {
  const ref = React.useRef(null);
  if (!ref.current) {
    const core = createFormControl(options),
      watching = { active: false };
    const api = {
      ...core,
      watch(...args) {
        if (typeof args[0] !== "function") watching.active = true;
        return core.watch(...args);
      },
    };
    ref.current = { core, api, watching };
  }
  const { api, core, watching } = ref.current,
    control = core.control;
  control._configure(options);
  const selection = useSelection(control, "form", () =>
    watching.active ? control._version() : null,
  );
  Object.defineProperty(api, "formState", {
    enumerable: true,
    configurable: true,
    get: () => selection.state,
  });
  const previous = React.useRef({ values: undefined, errors: undefined });
  React.useEffect(() => {
    control._mount();
  }, [control]);
  React.useEffect(() => {
    control._disable(options.disabled);
  }, [control, options.disabled]);
  React.useEffect(() => {
    if (
      options.values !== undefined &&
      !equal(previous.current.values, options.values)
    ) {
      previous.current.values = options.values;
      api.reset(options.values, options.resetOptions);
    }
    if (options.errors && options.errors !== previous.current.errors) {
      previous.current.errors = options.errors;
      control._setErrors(options.errors);
    }
  }, [options.values, options.errors, options.resetOptions, api]);
  return api;
}
function useController(props) {
  const context = React.useContext(Context),
    control = props.control || context?.control;
  if (!control) throw new Error("a form control or FormProvider is required");
  const { name, defaultValue, disabled, shouldUnregister } = props;
  const rules = { ...props.rules, disabled };
  control._ensure(name, rules);
  control._setDefault(name, defaultValue);
  const selection = useSelection(
    control,
    name,
    () => [
      control._fieldValue(name, defaultValue),
      control.getFieldState(name),
      control._state().disabled,
    ],
    name,
  );
  React.useEffect(() => {
    control._mountField(name);
    return () => control._unmountField(name, shouldUnregister);
  }, [control, name, shouldUnregister]);
  const onChange = React.useCallback(
      (value) => control._change(name, value),
      [control, name],
    ),
    onBlur = React.useCallback(
      () => control._change(name, undefined, true),
      [control, name],
    ),
    ref = React.useCallback(
      (node) => control._ref(name, node),
      [control, name],
    );
  const formState = selection.state;
  return {
    field: {
      name,
      value: control._fieldValue(name, defaultValue),
      onChange,
      onBlur,
      ref,
      ...(disabled !== undefined || formState.disabled
        ? { disabled: disabled || formState.disabled }
        : {}),
    },
    fieldState: control.getFieldState(name),
    formState,
  };
}
function Controller(props) {
  return props.render(useController(props));
}
function useWatch(props = {}) {
  const context = React.useContext(Context),
    control = props.control || context?.control;
  if (!control) throw new Error("a form control or FormProvider is required");
  const selection = useSelection(control, JSON.stringify(props.name), () =>
    props.name === undefined
      ? control.getValues()
      : Array.isArray(props.name)
        ? props.name.map((n) => control._fieldValue(n))
        : control._fieldValue(props.name, props.defaultValue),
  );
  return selection.read().values[0];
}
function useFormState(props = {}) {
  const context = React.useContext(Context),
    control = props.control || context?.control;
  if (!control) throw new Error("a form control or FormProvider is required");
  return useSelection(control, "state").state;
}
module.exports = {
  useForm,
  useController,
  Controller,
  useWatch,
  useFormState,
  FormProvider,
  useFormContext,
  createFormControl,
  get,
  set,
  appendErrors,
};
