"use strict";
module.exports = (z) => [
  [
    "valid and stripped",
    z.object({ name: z.string().min(2) }),
    { name: "Ada", extra: "drop" },
  ],
  ["required", z.object({ name: z.string() }), {}],
  [
    "nested",
    z.object({
      event: z.object({ title: z.string().min(1), date: z.string() }),
    }),
    { event: { title: "" } },
  ],
  [
    "array children",
    z.object({ items: z.array(z.object({ title: z.string().min(1) })) }),
    { items: [{ title: "" }, {}] },
  ],
  [
    "array root",
    z.object({ items: z.array(z.object({ title: z.string().min(1) })).min(2) }),
    { items: [{ title: "" }] },
    ["items.0.title"],
  ],
  [
    "union",
    z.object({
      x: z.union([z.object({ a: z.string() }), z.object({ b: z.number() })]),
    }),
    { x: {} },
    ["x.a", "x.b"],
  ],
  [
    "union nested",
    z.object({ x: z.union([z.union([z.string(), z.number()]), z.boolean()]) }),
    { x: null },
  ],
  [
    "number transform",
    z.object({ count: z.string().transform(Number) }),
    { count: "42" },
  ],
  ["defaults", z.object({ name: z.string().default("Default") }), {}],
  [
    "cross field",
    z
      .object({ password: z.string(), confirm: z.string() })
      .refine((v) => v.password === v.confirm, {
        message: "Mismatch",
        path: ["confirm"],
      }),
    { password: "a", confirm: "b" },
  ],
  [
    "multiple messages",
    z.object({
      name: z.string().superRefine((value, c) => {
        c.addIssue({ code: "custom", message: "One" });
        c.addIssue({ code: "custom", message: "Two" });
      }),
    }),
    { name: "x" },
  ],
  [
    "form root",
    z.object({ name: z.string() }).refine(() => false, { message: "Top" }),
    { name: "x" },
  ],
  [
    "nullable optional",
    z.object({ name: z.string().nullable(), other: z.string().optional() }),
    { name: null },
  ],
  ["coercion", z.object({ count: z.coerce.number().min(1) }), { count: "2" }],
  [
    "async refine",
    z.object({
      name: z.string().refine(async (v) => v === "good", "Unavailable"),
    }),
    { name: "bad" },
    undefined,
    true,
  ],
  [
    "async transform",
    z.object({ name: z.string().transform(async (v) => v.toUpperCase()) }),
    { name: "ada" },
    undefined,
    true,
  ],
];
