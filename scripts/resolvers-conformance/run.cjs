"use strict";
const assert = require("node:assert/strict"),
  own = require(
    process.env.VRESOLVERS_ZOD || "../../packages/vhookform-resolvers/zod.cjs",
  ).zodResolver;
const current = require("./node_modules/@hookform/resolvers/zod").zodResolver,
  app = require("./node_modules/resolvers-app/zod").zodResolver;
(async () => {
  let count = 0;
  for (const module of ["zod-app", "zod"]) {
    const z = require("./node_modules/" + module);
    for (const [
      label,
      schema,
      input,
      names,
      asynchronous,
    ] of require("./cases.cjs")(z))
      for (const mode of asynchronous ? ["async"] : ["sync", "async"])
        for (const raw of [false, true])
          for (const criteriaMode of ["firstError", "all"]) {
            const options = {
              fields: {},
              names: names || Object.keys(input),
              criteriaMode,
            };
            const expected = await current(schema, undefined, { mode, raw })(
              input,
              undefined,
              options,
            );
            const result = await own(schema, undefined, { mode, raw })(
              input,
              undefined,
              options,
            );
            assert.deepEqual(
              result,
              expected,
              module +
                " " +
                label +
                " " +
                mode +
                " raw=" +
                raw +
                " " +
                criteriaMode,
            );
            count++;
            if (module === "zod-app")
              assert.deepEqual(
                result,
                await app(schema, undefined, { mode, raw })(
                  input,
                  undefined,
                  options,
                ),
              );
          }
  }
  console.log(
    count + " Zod 3/4 resolver comparisons match current7.0.6 and app5.0.1.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
