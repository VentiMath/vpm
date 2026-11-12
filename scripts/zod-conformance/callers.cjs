"use strict";
// Read-only audit. Private application source is extracted in memory, never
// copied into the published package or committed fixture.
const { execFileSync } = require("node:child_process"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const acorn = require("./node_modules/acorn"),
  esbuild = require("../hook-form-conformance/node_modules/esbuild");
const app = process.argv[2];
if (!app)
  throw Error("Pass the application checkout for the read-only schema audit");
const ref = process.env.APP_REF || "origin/main",
  git = (...args) => execFileSync("git", args, { cwd: app, encoding: "utf8" });
const current = require("./node_modules/zod"),
  legacy = require("./node_modules/zod-app"),
  own = require(process.env.VZOD_ENTRY || "../../packages/vzod");
const helperSource = git("show", ref + ":functions/src/contentUrls.ts"),
  helperModule = { exports: {} };
vm.runInNewContext(
  esbuild.transformSync(helperSource, { loader: "ts", format: "cjs" }).code,
  { module: helperModule, exports: helperModule.exports, URL },
);
const { isContentImageUrl, isContentLinkUrl } = helperModule.exports;
const files = git(
  "grep",
  "-l",
  "-E",
  "(from|require).*['\"]zod['\"]",
  ref,
  "--",
  "*.ts",
  "*.tsx",
)
  .trim()
  .split("\n");
// Add only the explicitly retained legacy record shorthand and enum required
// message to the current control. The actual schema expressions stay unchanged.
const modern = {
  ...current,
  record: (a, b, ...rest) =>
    b === undefined
      ? current.record(current.string(), a)
      : current.record(a, b, ...rest),
  enum: (values, options) =>
    options?.required_error
      ? current.enum(values, {
          error: (i) =>
            i.input === undefined ? options.required_error : undefined,
        })
      : current.enum(values, options),
};
function declarations(source) {
  const code = esbuild.transformSync(source, {
      loader: "tsx",
      target: "es2022",
      format: "esm",
    }).code,
    tree = acorn.parse(code, { ecmaVersion: "latest", sourceType: "module" }),
    out = [];
  const visit = (node) => {
    if (
      node.type === "VariableDeclarator" &&
      node.id.type === "Identifier" &&
      (node.id.name === "roleOptions" || /schema$/i.test(node.id.name))
    )
      out.push("const " + code.slice(node.start, node.end) + ";");
    if (node.type === "FunctionDeclaration" && node.id.name === "buildSchema") {
      out.push(code.slice(node.start, node.end));
      return;
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value))
        value.forEach((x) => {
          if (x?.type) visit(x);
        });
      else if (value?.type) visit(value);
    }
  };
  visit(tree);
  return out.join("\n");
}
const fixture = {
  id: "id",
  name: "Ada",
  title: "Title",
  email: "ada@example.org",
  password: "long-password",
  passwordConfirm: "long-password",
  acceptTermsConditions: true,
  terms: true,
  remember: true,
  subject: "Subject",
  message: "Message",
  content: "Content",
  completed: true,
  start: "2026-11-12T10:00:00Z",
  end: "2026-11-12T11:00:00Z",
  allDay: false,
  extendedProps: { desc: "Note", label: "blue" },
  tasks: [],
  labels: [],
  archived: false,
  twoStepVerification: false,
  role: "student",
  firstName: "Ada",
  lastName: "Example",
  school: "School",
  gradeLevel: "10",
  armlYears: "0",
  parentFirstName: "Parent",
  parentLastName: "Example",
  parentPhone: "555",
  parentEmail: "parent@example.org",
  emailWarml2026: true,
  discordJoined: true,
  prompt: "A geometric diagram",
  size: "large",
  style: "sketch",
  quality: "high",
  artStyle: "ink",
  mood: "calm",
  lighting: "daylight",
  action: "buy",
  wallet: "main",
  amount: 2,
  amountType: "units",
  TextField: "Text",
  Native: "Text",
  Select: "20",
  Checkbox: true,
  Switch: true,
  RadioGroup: "female",
  Autocomplete: ["a", "b"],
  DatePicker: "2026-11-12",
};
const blocks = [
  { type: "text", value: "Text" },
  { type: "paragraph", text: "Text" },
  { type: "math", display: true, content: "x^2" },
  {
    type: "example",
    content: [
      {
        type: "problem",
        statement: "Problem",
        solution: [{ type: "text", value: "Answer" }],
      },
    ],
  },
  {
    type: "table",
    columns: ["A", "B"],
    rows: ["a|b"],
    colColors: ["red", null],
  },
  { type: "table", columns: ["A", "B"], rows: ["one"] },
  { type: "widget", value: "tool", props: { n: 2 } },
  { type: "code", lines: [{ text: "code" }] },
  { type: "cards", items: [{ title: "Card", width: 2 }], columns: 2 },
  { type: "steps", items: [{ title: "One", text: "First", color: "blue" }] },
  { type: "image", src: "https://example.org/image.png", alt: "Diagram" },
  {
    type: "rich-text",
    content: [{ text: "Link", url: "https://example.org" }],
  },
];
const samples = [
  {},
  null,
  fixture,
  { ...fixture, role: "parent" },
  { ...fixture, role: "volunteer" },
  { ...fixture, role: "other" },
  { ...fixture, role: undefined },
  ...Object.keys(fixture).flatMap((k) => [
    { ...fixture, [k]: undefined },
    { ...fixture, [k]: null },
  ]),
  { ...fixture, passwordConfirm: "wrong" },
  { ...fixture, oneOfThemRequired: true },
  ...blocks,
  {
    slides: [
      {
        id: "1",
        section: "A",
        title: "Title",
        sectionKey: "sub",
        content: blocks.filter(
          (b) => !(b.type === "table" && b.rows[0] === "one"),
        ),
      },
    ],
    sectionColors: { A: "#123ABC" },
  },
  { sub: [{ title: "Child", content: "Text" }] },
];
function evaluate(code, z) {
  const names = [...code.matchAll(/const (\w*[Ss]chema)\s*=/g)].map(
    (x) => x[1],
  );
  if (code.includes("function buildSchema")) names.push("buildSchema(x=>x)");
  return vm.runInNewContext(code + "\n[" + names.join(",") + "]", {
    z,
    t: (x) => x,
    labels: [{ title: "Existing" }],
    isContentImageUrl,
    isContentLinkUrl,
  });
}
function normalize(value) {
  if (Array.isArray(value)) return Array.from(value, normalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value))
      if (!(value.format === "email" && k === "pattern"))
        Object.defineProperty(out, k, {
          value: normalize(value[k]),
          enumerable: true,
        });
    return out;
  }
  return value;
}
function parse(schema, input) {
  try {
    const r = schema.safeParse(input);
    return normalize(
      r.success
        ? { success: true, data: r.data }
        : { success: false, issues: r.error.issues },
    );
  } catch (e) {
    return { thrown: e.name };
  }
}
let comparisons = 0,
  schemas = 0,
  legacyDifferences = 0;
const differences = [];
const records = [];
for (const file of files) {
  const source = git("show", file),
    code = declarations(source),
    v = evaluate(code, own),
    c = evaluate(code, modern),
    l = evaluate(code, legacy);
  assert.equal(v.length, c.length);
  schemas += v.length;
  for (let i = 0; i < v.length; i++)
    for (const sample of samples) {
      const a = parse(v[i], sample),
        b = parse(c[i], sample);
      try {
        assert.deepEqual(a, b);
      } catch {
        console.error(
          file,
          "schema",
          i,
          "sample",
          samples.indexOf(sample),
          JSON.stringify({ vpm: a, current: b }),
        );
        process.exit(1);
      }
      const older = parse(l[i], sample);
      if (
        a.success !== older.success ||
        (a.success && JSON.stringify(a.data) !== JSON.stringify(older.data))
      ) {
        legacyDifferences++;
        differences.push({
          file: file.slice(ref.length + 1),
          schema: i,
          sample: samples.indexOf(sample),
          current: a.success ? { data: a.data } : { success: a.success },
          legacy: older.success
            ? { data: older.data }
            : { success: older.success },
        });
      }
      comparisons++;
    }
  records.push({
    path: file.slice(ref.length + 1),
    sha256: crypto.createHash("sha256").update(source).digest("hex"),
    schemas: v.length,
  });
}
console.log(
  JSON.stringify(
    {
      revision: git("rev-parse", ref).trim(),
      files: files.length,
      schemas,
      comparisons,
      legacyAcceptanceOrOutputDifferences: legacyDifferences,
      differences,
      records,
    },
    null,
    2,
  ),
);
