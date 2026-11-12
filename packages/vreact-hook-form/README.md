# vreact-hook-form

Independent form state and React bindings for VentiMath's forms, targeting React
Hook Form 7.92.0 and compared with the app's pinned 7.56.0. React 19.3 is the only
peer; there are no runtime dependencies. Built and tested; not yet released or
adopted by VentiMath.

```tsx
import { Controller, useForm } from "vreact-hook-form";

function NameForm() {
  const form = useForm({ defaultValues: { name: "" }, mode: "onChange" });
  return (
    <form onSubmit={form.handleSubmit(console.log)}>
      <Controller
        name="name"
        control={form.control}
        rules={{ required: "Required" }}
        render={({ field }) => <input {...field} />}
      />
      <button disabled={form.formState.isSubmitting}>Save</button>
    </form>
  );
}
```

## Supported caller contract

`useForm`, `Controller`, `useController`, `FormProvider`, `useFormContext`,
`useWatch` and `useFormState` cover controlled inputs and single native fields.
The returned methods include `register`, `unregister`, `watch`, `getValues`,
`setValue`, `trigger`, `handleSubmit`, `reset`, `getFieldState`, `setError`,
`clearErrors`, `setFocus` and `subscribe`; `createFormControl` exposes the store
without a React root. Nested dot/numeric-bracket paths and typed field values
support calendar objects, settings and conditional WARML steps.

Built-in required, length, numeric bounds, pattern and custom validators work
with the five validation modes. Resolver input/output transforms, selective step
validation, dirty/touched/error state, async submission and reset retention flags
are covered. The unchanged upstream Zod 3 resolver is a test control, not a
runtime dependency. Unmounted conditional fields retain their values by default.

Validation belongs to a value revision and reset epoch: a result for stale values
is retried, and a reset discards outstanding results. Defaults and public value
snapshots are isolated. Unsafe prototype paths and oversized numeric indexes
are rejected. These guards intentionally reject inputs upstream may accept.

## Boundaries

This is the application contract, not all of React Hook Form. `useFieldArray`,
`useLens`, native radio/checkbox groups, async default-value functions, native
browser validation, delayed errors, progressive enhancement and the upstream
`Form`/`FormStateSubscribe` components are outside scope. Hooks observe their own field and the form-state properties read by their
render; unrelated controlled inputs keep their rendered nodes and focus. `subscribe`
filters by related field name but does not optimize notification delivery by
`formState` flags. Arrays can be values or named paths; this does not implement
dynamic field-array registration. Cyclic plain data is rejected; nonplain host
objects such as File are retained by reference. Type paths are bounded to seven
levels. Cross-realm hosts and every third-party resolver are not certified.

[Checks](../../scripts/hook-form-conformance/README.md) cover React 19.3.1,
Node 24, Bun 1.4.4, Chrome, TS7 and packed consumers.
[Measurements](bench/results/README.md) separate server rendering, state operations and
validation; [mounted updates](bench/updates/README.md) exercise actual React DOM commits. [Provenance](PROVENANCE.json) records the scope and controls.
