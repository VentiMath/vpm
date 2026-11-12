"use strict";
const { toNestErrors, validateFieldsNatively } = require("./index.cjs");
function issueErrors(issues, all) {
  const errors = Object.create(null),
    queue = issues.map((issue) => ({ issue, prefix: [] }));
  // Index-based breadth-first traversal avoids shifting or changing Zod's issues.
  for (let index = 0; index < queue.length; index++) {
    const { issue, prefix } = queue[index],
      path = [...prefix, ...issue.path],
      name = path.join(".");
    const branches = issue.unionErrors?.map((e) => e.issues) || issue.errors;
    const union = issue.code === "invalid_union" && Array.isArray(branches);
    const first = union ? branches[0]?.[0] : issue;
    if (!Object.hasOwn(errors, name))
      errors[name] = {
        message: first?.message ?? issue.message,
        type: first?.code ?? issue.code,
      };
    if (all) {
      const types = errors[name].types || (errors[name].types = {}),
        previous = Object.hasOwn(types, issue.code)
          ? types[issue.code]
          : undefined;
      Object.defineProperty(types, issue.code, {
        value:
          previous === undefined
            ? issue.message
            : Array.isArray(previous)
              ? [...previous, issue.message]
              : [previous, issue.message],
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    if (union)
      for (const branch of branches)
        for (const child of branch)
          queue.push({ issue: child, prefix: issue.unionErrors ? [] : path });
  }
  return errors;
}
function zodResolver(schema, schemaOptions, resolverOptions = {}) {
  if (
    !schema ||
    typeof schema.safeParse !== "function" ||
    typeof schema.safeParseAsync !== "function"
  )
    throw new TypeError(
      "a Zod schema with safeParse and safeParseAsync is required",
    );
  const { mode = "async", raw = false } = resolverOptions;
  if (mode !== "sync" && mode !== "async")
    throw new TypeError("resolver mode must be sync or async");
  if (typeof raw !== "boolean")
    throw new TypeError("resolver raw must be boolean");
  const finish = (result, values, options) => {
    if (result.success) {
      if (options.shouldUseNativeValidation)
        validateFieldsNatively({}, options);
      return { values: raw ? { ...values } : result.data, errors: {} };
    }
    return {
      values: {},
      errors: toNestErrors(
        issueErrors(
          result.error.issues,
          options.criteriaMode === "all" && !options.shouldUseNativeValidation,
        ),
        options,
      ),
    };
  };
  return mode === "sync"
    ? async (values, _context, options = {}) =>
        finish(schema.safeParse(values, schemaOptions), values, options)
    : async (values, _context, options = {}) =>
        finish(
          await schema.safeParseAsync(values, schemaOptions),
          values,
          options,
        );
}
module.exports = { zodResolver };
