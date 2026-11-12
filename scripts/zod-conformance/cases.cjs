"use strict";
module.exports = (z) => {
  const recursive = z.lazy(() =>
    z.union([
      z.object({ type: z.literal("text"), value: z.string() }),
      z.object({ type: z.literal("group"), items: z.array(recursive) }),
    ]),
  );
  return [
    ["string", z.string()],
    ["number", z.number()],
    ["boolean", z.boolean()],
    ["unknown", z.unknown()],
    ["bounds", z.string().min(2).max(4)],
    ["nonempty", z.string().nonempty("Required")],
    ["regex", z.string().regex(/^[a-z]+$/g, "Letters only")],
    ["email", z.string().email()],
    ["url", z.string().url()],
    ["int", z.number().int().positive().max(Number.MAX_SAFE_INTEGER)],
    ["number bounds", z.number().min(2).max(4)],
    ["optional", z.string().optional()],
    ["nullable", z.string().nullable()],
    ["nullish", z.string().nullish()],
    ["default", z.string().default("Default")],
    ["optional default", z.array(z.string()).default([]).optional()],
    ["trim checks", z.string().trim().min(2).toUpperCase()],
    ["enum", z.enum(["a", "b"])],
    ["literal", z.literal("a")],
    ["array", z.array(z.string().min(1)).min(2).max(4)],
    [
      "object",
      z.object({
        name: z.string(),
        flag: z.boolean().optional(),
        items: z.array(z.string()).default([]).optional(),
      }),
    ],
    ["strict", z.object({ name: z.string() }).strict()],
    ["passthrough", z.object({ name: z.string() }).passthrough()],
    ["union", z.union([z.string().min(2), z.number().min(2)])],
    [
      "nested union",
      z.object({
        items: z.array(
          z.union([
            z.object({ name: z.string() }),
            z.object({ count: z.number() }),
          ]),
        ),
      }),
    ],
    ["record", z.record(z.string(), z.number())],
    ["recursive", recursive],
    [
      "refine",
      z
        .string()
        .min(2)
        .refine((v) => v.startsWith("a"), "Start with a"),
    ],
    [
      "confirmation",
      z
        .object({ password: z.string(), confirmation: z.string() })
        .refine((v) => v.password === v.confirmation, {
          path: ["confirmation"],
          message: "Mismatch",
        }),
    ],
    [
      "superRefine",
      z
        .object({ name: z.string(), agreed: z.boolean().optional() })
        .superRefine((v, c) => {
          if (!v.agreed)
            c.addIssue({
              code: "custom",
              path: ["agreed"],
              message: "Required",
            });
          if (v.name === "a")
            c.addIssue({ code: "custom", path: ["name"], message: "Longer" });
        }),
    ],
    ["transform", z.string().transform((v) => v.length)],
    ["coerce", z.coerce.number().min(1)],
    [
      "extend",
      z
        .object({ name: z.string() })
        .extend({ name: z.string().optional(), count: z.number() }),
    ],
    ["async refine", z.string().refine(async (v) => v === "a", "Only a"), true],
    [
      "async nested",
      z.object({
        name: z.string().transform(async (v) => v.toUpperCase()),
        count: z.number(),
      }),
      true,
    ],
  ];
};
module.exports.inputs = [
  undefined,
  null,
  false,
  true,
  0,
  1,
  2,
  3,
  4,
  5,
  NaN,
  Infinity,
  1.5,
  Number.MAX_SAFE_INTEGER + 1,
  "",
  "a",
  "ab",
  "abcde",
  "  ab  ",
  "😀",
  "😀a",
  "e\u0301",
  "a@example.com",
  "a..b@example.com",
  "a'@example.com",
  "https://example.org",
  "abc",
  ["a"],
  ["a", "b"],
  ["", 4],
  {},
  { name: "Ada" },
  { name: "a", agreed: false },
  { name: "a", flag: true, extra: "strip" },
  { name: 3, items: [false] },
  { name: "a", count: 2 },
  { password: "a", confirmation: "b" },
  { password: "a", confirmation: "a" },
  { items: [{}] },
  { a: 1, b: "x" },
  { type: "text", value: "hello" },
  { type: "group", items: [{ type: "text", value: "hello" }] },
  { type: "group", items: [{ type: "text", value: 3 }] },
];
