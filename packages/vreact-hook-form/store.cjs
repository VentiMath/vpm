"use strict";
const {
  parts,
  get,
  set,
  unset,
  clone,
  equal,
  dirty,
  related,
} = require("./paths.cjs");
const modes = new Set(["onSubmit", "onChange", "onBlur", "onTouched", "all"]);
const initial = () => ({
  isDirty: false,
  isLoading: false,
  isSubmitted: false,
  isSubmitSuccessful: false,
  isSubmitting: false,
  isValidating: false,
  isValid: false,
  disabled: false,
  submitCount: 0,
  dirtyFields: {},
  touchedFields: {},
  validatingFields: {},
  errors: {},
  isReady: false,
});
function appendErrors(name, all, errors, type, message) {
  return all
    ? {
        ...get(errors, name),
        types: { ...get(errors, name)?.types, [type]: message || true },
      }
    : {};
}
function createFormControl(options = {}) {
  let opts = {},
    defaults = {},
    values = {},
    state = initial(),
    version = 0,
    revision = 0,
    epoch = 0,
    seq = 0,
    lastValidity = 0,
    pending = 0,
    submissions = 0;
  const watchCache = new Map();
  const fields = new Map(),
    listeners = new Set(),
    watchers = new Set(),
    requests = new Map(),
    validating = new Map();
  function configure(next) {
    if (!next || typeof next !== "object")
      throw new TypeError("form options must be an object");
    if (next.mode !== undefined && !modes.has(next.mode))
      throw new TypeError("invalid validation mode");
    if (next.reValidateMode !== undefined && !modes.has(next.reValidateMode))
      throw new TypeError("invalid revalidation mode");
    for (const k of [
      "delayError",
      "progressive",
      "shouldUseNativeValidation",
      "formControl",
      "validate",
    ])
      if (next[k])
        throw new TypeError(k + " is outside the supported form contract");
    if (typeof next.defaultValues === "function")
      throw new TypeError(
        "async defaultValues are not supported; reset when loaded",
      );
    if (next.resolver !== undefined && typeof next.resolver !== "function")
      throw new TypeError("resolver must be a function");
    opts = {
      mode: "onSubmit",
      reValidateMode: "onChange",
      shouldFocusError: true,
      ...next,
    };
  }
  configure(options);
  defaults = clone(opts.values || opts.defaultValues || {});
  values = clone(defaults);
  state.defaultValues = defaults;
  state.disabled = !!opts.disabled;
  function emit(names = [], valueChange = false) {
    if (valueChange) watchCache.clear();
    version++;
    for (const listener of [...listeners])
      if (listeners.has(listener)) listener(names, valueChange);
    if (valueChange)
      for (const watcher of [...watchers])
        if (watchers.has(watcher))
          watcher(clone(values), {
            name: names.length === 1 ? names[0] : undefined,
            type: "change",
            values: clone(values),
          });
  }
  function patch(change, names = [], valueChange = false) {
    state = { ...state, ...change };
    emit(names, valueChange);
  }
  function namesOf(name) {
    return name === undefined
      ? [...fields.keys()]
      : Array.isArray(name)
        ? name.map((n) => (parts(n), n))
        : (parts(name), [name]);
  }
  function sync(f) {
    for (const ref of f.refs) {
      if (!ref || !("value" in ref)) continue;
      const value = get(values, f.name);
      if (ref.type === "checkbox")
        ref.checked = Array.isArray(value)
          ? value.includes(ref.value)
          : !!value;
      else if (ref.type === "radio") ref.checked = value === ref.value;
      else if (ref.type !== "file") ref.value = value == null ? "" : value;
    }
  }
  function ensure(name, rules = {}) {
    parts(name);
    let f = fields.get(name);
    if (!f) {
      f = { name, rules, refs: new Set(), mounted: true, controlled: false };
      fields.set(name, f);
    } else f.rules = rules;
    return f;
  }
  function markDirty(name) {
    const map = clone(state.dirtyFields),
      d = dirty(get(values, name), get(defaults, name));
    if (d === undefined) unset(map, name);
    else set(map, name, d);
    state = { ...state, dirtyFields: map, isDirty: !equal(values, defaults) };
  }
  function eventValue(input, f) {
    if (input && typeof input === "object" && input.target) {
      const t = input.target;
      if (t.type === "checkbox") return t.checked;
      if (t.type === "file") return t.files;
      return t.value;
    }
    return input;
  }
  function convert(value, f) {
    if (f.rules.valueAsNumber) return value === "" ? NaN : Number(value);
    if (f.rules.valueAsDate)
      return value instanceof Date ? value : new Date(value);
    return f.rules.setValueAs ? f.rules.setValueAs(value) : value;
  }
  function focus(names) {
    for (const name of names) {
      if (!get(state.errors, name)) continue;
      const f = fields.get(name);
      for (const ref of f?.refs || [])
        if (typeof ref.focus === "function") {
          ref.focus();
          return;
        }
    }
  }
  async function ruleError(f, snapshot) {
    if (!f.mounted || f.rules.disabled || opts.disabled) return undefined;
    const value = get(snapshot, f.name),
      rules = f.rules,
      all = opts.criteriaMode === "all";
    let error;
    const add = (type, message) => {
      error ||= {
        type,
        message: typeof message === "string" ? message : "",
        ref: [...f.refs][0],
      };
      if (all) error.types = { ...error.types, [type]: message || true };
      return !all;
    };
    const rule = (k) => {
      const r = rules[k];
      return r && typeof r === "object" && !(r instanceof RegExp)
        ? r
        : { value: r, message: "" };
    };
    const required = rule("required");
    if (
      required.value &&
      (value === undefined ||
        value === null ||
        value === "" ||
        value === false ||
        (Array.isArray(value) && !value.length))
    ) {
      if (
        add(
          "required",
          typeof required.value === "string"
            ? required.value
            : required.message,
        )
      )
        return error;
    }
    if (value !== "" && value != null) {
      for (const k of ["min", "max"]) {
        const r = rule(k);
        if (
          r.value !== undefined &&
          (k === "min"
            ? Number(value) < Number(r.value)
            : Number(value) > Number(r.value)) &&
          add(k, r.message)
        )
          return error;
      }
      for (const k of ["minLength", "maxLength"]) {
        const r = rule(k);
        if (
          r.value !== undefined &&
          typeof value.length === "number" &&
          (k === "minLength"
            ? value.length < r.value
            : value.length > r.value) &&
          add(k, r.message)
        )
          return error;
      }
      const r = rule("pattern");
      if (r.value instanceof RegExp) {
        const re = new RegExp(r.value.source, r.value.flags);
        if (!re.test(String(value)) && add("pattern", r.message)) return error;
      }
    }
    const validators =
      typeof rules.validate === "function"
        ? { validate: rules.validate }
        : rules.validate || {};
    for (const [type, fn] of Object.entries(validators)) {
      const result = await fn(value, clone(snapshot));
      if (
        result === false ||
        typeof result === "string" ||
        Array.isArray(result)
      ) {
        if (add(type, result)) return error;
      }
    }
    return error;
  }
  async function validate(name, show = true, updateValidity = true) {
    const selected = namesOf(name),
      run = ++seq,
      started = epoch;
    selected.forEach((n) => {
      requests.set(n, run);
      validating.set(n, (validating.get(n) || 0) + 1);
    });
    pending++;
    const busy = {};
    for (const [n, count] of validating) if (count) set(busy, n, true);
    patch({ isValidating: true, validatingFields: busy }, selected);
    try {
      let result, rev;
      do {
        rev = revision;
        const snapshot = clone(values);
        if (opts.resolver) {
          const resolverFields = {};
          for (const [n, f] of fields)
            if (f.mounted)
              resolverFields[n] = { name: n, ...f.rules, ref: [...f.refs][0] };
          result = await opts.resolver(snapshot, opts.context, {
            criteriaMode: opts.criteriaMode,
            names: selected,
            fields: resolverFields,
            shouldUseNativeValidation: false,
          });
          if (!result || !result.errors || typeof result.errors !== "object")
            throw new TypeError("resolver must return values and errors");
        } else {
          const errors = {};
          for (const f of fields.values()) {
            const e = await ruleError(f, snapshot);
            if (e) set(errors, f.name, e);
          }
          result = { values: snapshot, errors };
        }
      } while (rev !== revision && started === epoch);
      if (started !== epoch)
        return { valid: false, values: clone(values), stale: true };
      const errors = clone(state.errors),
        allValid = Object.keys(result.errors).length === 0;
      if (show) {
        if (
          name === undefined &&
          selected.every((n) => requests.get(n) === run)
        ) {
          state = { ...state, errors: result.errors };
        } else {
          for (const n of selected)
            if (requests.get(n) === run) {
              const e = get(result.errors, n);
              if (e) set(errors, n, e);
              else unset(errors, n);
            }
          state = { ...state, errors };
        }
      }
      if (updateValidity && run >= lastValidity) {
        lastValidity = run;
        state = { ...state, isValid: allValid };
      }
      emit(selected);
      return {
        valid:
          name === undefined
            ? allValid
            : selected.every((n) => !get(result.errors, n)),
        values: result.values,
        errors: result.errors,
      };
    } finally {
      if (started === epoch) {
        pending--;
        for (const n of selected)
          validating.set(n, Math.max(0, (validating.get(n) || 0) - 1));
        const map = {};
        for (const [n, count] of validating) if (count) set(map, n, true);
        patch({ isValidating: pending > 0, validatingFields: map }, selected);
      }
    }
  }
  function shouldValidate(blur, name) {
    const mode = state.isSubmitted ? opts.reValidateMode : opts.mode;
    return (
      mode === "all" ||
      (mode === "onBlur" && blur) ||
      (mode === "onChange" && !blur) ||
      (mode === "onTouched" && (blur || get(state.touchedFields, name)))
    );
  }
  function change(name, input, blur = false) {
    const f = ensure(name, fields.get(name)?.rules);
    if (blur) {
      const touched = clone(state.touchedFields);
      set(touched, name, true);
      patch({ touchedFields: touched }, [name]);
      f.rules.onBlur?.(input);
    } else {
      const value = convert(eventValue(input, f), f);
      set(values, name, clone(value));
      revision++;
      markDirty(name);
      sync(f);
      emit([name], true);
      f.rules.onChange?.(input);
    }
    if (shouldValidate(blur, name)) return validate(name);
    if (!blur && opts.mode !== "onBlur") return validate(name, false);
    return Promise.resolve();
  }
  function register(name, rules = {}) {
    const f = ensure(name, rules);
    f.mounted = true;
    if (get(values, name) === undefined && rules.value !== undefined)
      set(values, name, clone(rules.value));
    f.registration ||= {
      name,
      onChange: (event) => change(name, event),
      onBlur: (event) => change(name, event, true),
      ref: (ref) => {
        if (ref) {
          f.refs.add(ref);
          f.mounted = true;
          if (get(values, name) === undefined && "value" in ref) {
            const v = ref.type === "checkbox" ? ref.checked : ref.value;
            set(values, name, convert(v, f));
          }
          sync(f);
        } else {
          f.refs.clear();
          f.mounted = false;
          if (opts.shouldUnregister)
            queueMicrotask(() => {
              if (!f.mounted && fields.get(name) === f) unregister(name);
            });
        }
      },
    };
    return {
      ...f.registration,
      disabled: opts.disabled || rules.disabled || undefined,
    };
  }
  function setValue(name, value, flags = {}) {
    parts(name);
    set(values, name, clone(value));
    revision++;
    if (flags.shouldDirty) markDirty(name);
    if (flags.shouldTouch) {
      const touched = clone(state.touchedFields);
      set(touched, name, true);
      state = { ...state, touchedFields: touched };
    }
    for (const [n, f] of fields) if (related(n, name)) sync(f);
    emit([name], true);
    if (flags.shouldValidate) void validate(name);
  }
  function getValues(name) {
    if (Array.isArray(name)) return name.map((n) => clone(get(values, n)));
    return clone(name === undefined ? values : get(values, name));
  }
  function watch(name, fallback) {
    if (typeof name === "function") {
      watchers.add(name);
      return { unsubscribe: () => watchers.delete(name) };
    }
    const key = JSON.stringify(name);
    if (!watchCache.has(key)) watchCache.set(key, getValues(name));
    const found = watchCache.get(key);
    return found === undefined ? fallback : found;
  }
  function reset(input, flags = {}) {
    const next = clone(
      typeof input === "function"
        ? input(clone(values))
        : input === undefined
          ? defaults
          : input,
    );
    if (
      !Object.keys(flags).length &&
      equal(next, values) &&
      equal(next, defaults) &&
      !state.isDirty &&
      !Object.keys(state.errors).length &&
      !Object.keys(state.touchedFields).length &&
      !state.isSubmitted &&
      !state.isSubmitting &&
      !state.isValidating
    )
      return;
    epoch++;
    revision++;
    pending = 0;
    submissions = 0;
    requests.clear();
    validating.clear();
    lastValidity = 0;
    if (!flags.keepDefaultValues) defaults = clone(next);
    let replacement = clone(next);
    if (flags.keepDirtyValues)
      for (const name of fields.keys())
        if (get(state.dirtyFields, name))
          set(replacement, name, clone(get(values, name)));
    if (!flags.keepValues) values = replacement;
    const before = state;
    state = {
      ...initial(),
      defaultValues: defaults,
      disabled: !!opts.disabled,
      isReady: before.isReady,
    };
    for (const [flag, key] of [
      ["keepErrors", "errors"],
      ["keepTouched", "touchedFields"],
      ["keepIsSubmitted", "isSubmitted"],
      ["keepIsSubmitSuccessful", "isSubmitSuccessful"],
      ["keepSubmitCount", "submitCount"],
      ["keepIsValid", "isValid"],
    ])
      if (flags[flag]) state[key] = before[key];
    if (flags.keepDirty || flags.keepDirtyValues) {
      state.dirtyFields = before.dirtyFields;
      state.isDirty = before.isDirty;
    } else if (flags.keepDefaultValues) {
      state.dirtyFields = dirty(values, defaults) || {};
      state.isDirty = !equal(values, defaults);
    }
    for (const f of fields.values()) sync(f);
    emit([], true);
    if (before.isReady && !flags.keepIsValid) void validate(undefined, false);
  }
  function unregister(name, flags = {}) {
    for (const n of namesOf(name)) {
      for (const k of [...fields.keys()])
        if (k === n || k.startsWith(n + ".")) fields.delete(k);
      if (!flags.keepValue) unset(values, n);
      if (!flags.keepDefaultValue) unset(defaults, n);
      if (!flags.keepError) unset(state.errors, n);
      if (!flags.keepDirty) unset(state.dirtyFields, n);
      if (!flags.keepTouched) unset(state.touchedFields, n);
    }
    revision++;
    state = { ...state, isDirty: !equal(values, defaults) };
    emit([], true);
  }
  function setError(name, error, config = {}) {
    parts(name);
    const errors = clone(state.errors);
    set(errors, name, {
      ...error,
      ref: [...(fields.get(name)?.refs || [])][0],
    });
    patch({ errors, isValid: false }, [name]);
    if (config.shouldFocus) focus([name]);
  }
  function clearErrors(name) {
    const errors = clone(state.errors);
    if (name === undefined) patch({ errors: {} });
    else {
      namesOf(name).forEach((n) => unset(errors, n));
      patch({ errors }, namesOf(name));
    }
  }
  function getFieldState(name, s = state) {
    return {
      invalid: !!get(s.errors, name),
      isDirty: !!get(s.dirtyFields, name),
      isTouched: !!get(s.touchedFields, name),
      isValidating: !!get(s.validatingFields, name),
      error: get(s.errors, name),
    };
  }
  function handleSubmit(onValid, onInvalid) {
    return async (event) => {
      event?.preventDefault?.();
      event?.persist?.();
      const started = epoch;
      submissions++;
      patch({ isSubmitting: true });
      let successful = false;
      try {
        const result = await validate(undefined, true, !!opts.resolver);
        if (result.stale) return;
        if (result.valid) {
          const data = clone(result.values);
          for (const [name, f] of fields)
            if (f.rules.disabled || opts.disabled) set(data, name, undefined);
          await onValid(data, event);
          successful = true;
        } else {
          await onInvalid?.(state.errors, event);
          if (opts.shouldFocusError) focus([...fields.keys()]);
        }
      } finally {
        if (started === epoch) {
          submissions--;
          patch({
            isSubmitting: submissions > 0,
            isSubmitted: true,
            isSubmitSuccessful: successful,
            submitCount: state.submitCount + 1,
          });
        }
      }
    };
  }
  const control = {
    register,
    unregister,
    getValues,
    setValue,
    reset,
    getFieldState,
    _subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    _version: () => version,
    _state: () => state,
    _configure: configure,
    _setErrors(errors) {
      patch({ errors: clone(errors), isValid: false });
    },
    _disable(disabled) {
      if (state.disabled !== !!disabled) patch({ disabled: !!disabled });
    },
    _ensure: ensure,
    _change: change,
    _validate: validate,
    _mount() {
      patch({ isReady: true });
      void validate(undefined, false);
    },
    _unmountField(name, remove) {
      const f = fields.get(name);
      if (f) f.mounted = false;
      if (remove ?? opts.shouldUnregister)
        queueMicrotask(() => {
          if (f && !f.mounted && fields.get(name) === f) unregister(name);
        });
    },
    _mountField(name) {
      const f = fields.get(name);
      if (f) f.mounted = true;
    },
    _fieldValue(name, fallback) {
      return get(values, name, fallback);
    },
    _setDefault(name, value) {
      if (get(values, name) === undefined && value !== undefined)
        set(values, name, clone(value));
    },
    _ref(name, node) {
      const f = fields.get(name);
      if (!f) return;
      if (node) f.refs.add(node);
      else f.refs.clear();
    },
    _options: () => opts,
  };
  Object.defineProperties(control, {
    _formState: { get: () => state },
    _formValues: { get: () => values },
    _defaultValues: { get: () => defaults },
    _fields: {
      get: () =>
        Object.fromEntries(
          [...fields].map(([k, f]) => [
            k,
            { _f: { ...f.rules, name: k, ref: [...f.refs][0] } },
          ]),
        ),
    },
  });
  const api = {
    control,
    register,
    unregister,
    handleSubmit,
    watch,
    getValues,
    setValue,
    reset,
    setError,
    clearErrors,
    getFieldState,
    trigger: async (name, config = {}) => {
      const result = await validate(name);
      if (!result.valid && config.shouldFocus) focus(namesOf(name));
      return result.valid;
    },
    setFocus(name, config = {}) {
      for (const ref of fields.get(name)?.refs || []) {
        ref.focus?.();
        if (config.shouldSelect) ref.select?.();
        break;
      }
    },
    subscribe(config) {
      const listener = (names, changed) => {
        if (
          config.name &&
          !names.some((n) => namesOf(config.name).some((k) => related(n, k))) &&
          names.length
        )
          return;
        config.callback({ ...state, values: clone(values), name: names[0] });
      };
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  Object.defineProperty(api, "formState", {
    enumerable: true,
    get: () => state,
  });
  api.formControl = api;
  return api;
}
module.exports = { createFormControl, get, set, appendErrors };
