"use strict";
const { execFileSync } = require("node:child_process"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { fixture, packages, esbuild, peer } = require("./paths.cjs");
const repo = process.argv[2],
  ref = process.argv[3] || "origin/main";
if (!repo) throw Error("Pass a VentiMath checkout and optional revision");
const source = execFileSync(
  "git",
  ["show", ref + ":src/components/WARML/practice/warml/PracticeSignupCard.tsx"],
  { cwd: repo, encoding: "utf8" },
);
function between(begin, end) {
  const start = source.indexOf(begin),
    stop = source.indexOf(end, start);
  assert.ok(start >= 0 && stop > start, begin);
  return source.slice(start, stop);
}
const entry = [
  ...source.matchAll(
    /^import (?:Rating|Box|Typography|TextField|Tooltip|Button|SyncProblemIcon) from .*$/gm,
  ),
]
  .map((m) => m[0])
  .concat(
    between("const SCHEDULE_SLOTS", "interface PracticeSignupMeta"),
    between("function SchedulePoll", "const ARML_LOCAL_SLOTS"),
    between("const RELAY_POSITION_SLOTS", "function LocalContestPrefsPoll"),
    "export {SchedulePoll,RelayPrefsPoll,Rating};",
  )
  .join("\n");
const dir = fs.mkdtempSync(
  path.join(fixture, "node_modules", ".warml-rating-"),
);
try {
  const react = peer("react"),
    ssr = peer("react-dom/server").renderToString,
    { JSDOM } = peer("jsdom");
  for (const own of [false, true]) {
    const file = path.join(dir, own ? "vpm.cjs" : "control.cjs"),
      material = path.dirname(peer.resolve("mui-material-app"));
    const alias = Object.fromEntries(
      Object.entries(
        require("../mui-system-conformance/aliases.cjs")(true, "app"),
      ).filter(([k]) => k.startsWith("v")),
    );
    esbuild.buildSync({
      stdin: { contents: entry, resolveDir: dir, loader: "tsx" },
      bundle: true,
      platform: "node",
      format: "cjs",
      outfile: file,
      jsx: "automatic",
      external: ["react", "react-dom"],
      alias: {
        ...alias,
        "@mui/material": material,
        "@mui/icons-material": path.dirname(
          peer.resolve("mui-icons-material-app"),
        ),
        "@mui/material/Rating": own
          ? packages + "/vmui-material/Rating.mjs"
          : material + "/Rating/index.js",
      },
      logLevel: "silent",
    });
    const { SchedulePoll, RelayPrefsPoll, Rating } = require(file);
    for (const [Component, expected, preferences] of [
      [
        SchedulePoll,
        ["satEarly", "satEvening", "sunEarly", "sunEvening", "monEvening"],
        { satEvening: 4 },
      ],
      [RelayPrefsPoll, ["front", "middle", "back"], { middle: 4 }],
    ]) {
      const updates = [];
      const props = {
        prefs: preferences,
        positionPrefs: preferences,
        teammates: "",
        onChange: (...args) => updates.push(args),
        onPositionChange: (...args) => updates.push(args),
        onTeammatesChange: () => {},
      };
      const el = Component(props),
        roots = [];
      function visit(child) {
        if (!react.isValidElement(child)) return;
        if (child.type === Rating) roots.push(child);
        else react.Children.forEach(child.props.children, visit);
      }
      visit(el);
      assert.equal(roots.length, expected.length);
      for (const [i, control] of roots.entries()) {
        const p = control.props;
        assert.equal(p.value, preferences[expected[i]] ?? 0);
        assert.equal(p.max, 5);
        assert.equal(p.size, "small");
        p.onChange({}, 5);
        p.onChange({}, null);
        assert.deepEqual(updates.splice(0), [
          [expected[i], 5],
          [expected[i], 0],
        ]);
      }
      const doc = JSDOM.fragment(
        ssr(el).replace(/<style[\s\S]*?<\/style>/g, ""),
      );
      assert.equal(
        doc.querySelectorAll('.MuiRating-root input[type="radio"]').length,
        expected.length * 6,
      );
      assert.deepEqual(
        [...doc.querySelectorAll(".MuiRating-root input:checked")].map(
          (i) => i.value,
        ),
        ["4"],
      );
    }
  }
  console.log(
    "Both original WARML poll functions rendered, and all eight preference rows passed selection and clear to their callbacks.",
  );
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
