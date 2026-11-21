"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { fixture, packages, esbuild, peer } = require("./paths.cjs");
if (!process.argv[2])
  throw Error("Pass a VentiMath checkout and optional Git revision");
const cwd = path.resolve(process.argv[2]),
  ref = process.argv[3] || "origin/main";
const dir = fs.mkdtempSync(path.join(fixture, "node_modules", ".imo-grid-"));
const file = (name, text) => {
  const output = path.join(dir, name);
  fs.writeFileSync(output, text);
  return output;
};
const source = (name, src) =>
  file(name, execFileSync("git", ["show", ref + ":src/" + src], { cwd }));
const h = peer("react").createElement,
  render = peer("react-dom/server").renderToStaticMarkup;
try {
  const entry = source("imo.tsx", "components/IMO/IMOView.tsx");
  const data = file(
    "data.js",
    `export const useTranslation=()=>({t:key=>key,i18n:{language:"en"}});
    export const useSearchParams=()=>[new URLSearchParams()];
    export const useIMOYears=()=>globalThis.yearList;
    export const useIMOContestants=()=>[],useIMOCountryResults=()=>[],useIMOYear=()=>null;
    export const useExamsByCompetition=()=>[],useProblemsByIds=()=>[];
    export const LaTeX=()=>null,PrintPreview=()=>null;export default ()=>null;`,
  );
  file("IMOTeamView.js", "export default ()=>null");
  const icon = file(
    "icon.jsx",
    'export default ()=> <svg aria-hidden="true"/>',
  );
  const mat = path.dirname(peer.resolve("mui-material-app"));
  const alias = {
    "@mui/material": mat,
    "react-i18next": data,
    "react-router": data,
    "@/components/brandPalette": source(
      "brand.ts",
      "components/brandPalette.ts",
    ),
    "@/utils/activation": source("activation.ts", "utils/activation.ts"),
    "@/utils/ordinal": source("ordinal.ts", "utils/ordinal.ts"),
    "@/app/(control-panel)/apps/contests/components/ui/PersonLink": data,
    "@/components/problems": data,
    "@/contexts/IMOServiceContext": data,
    "@/contexts/ProblemsServiceContext": data,
  };
  for (const [, id] of fs
    .readFileSync(entry, "utf8")
    .matchAll(/from '(@mui\/icons-material\/[^']+)'/g))
    alias[id] = icon;
  const samples = [
    { loading: true, years: [] },
    { loading: false, years: [] },
    { loading: false, years: [], error: true },
    {
      loading: false,
      years: [
        { year: 2014, imoNumber: 55, hostCountry: "Test country" },
        { year: 2026, imoNumber: 67, hostCountry: "Test country" },
      ],
    },
  ];
  const vpm = Object.fromEntries(
    Object.entries(
      require("../mui-system-conformance/aliases.cjs")(true, "app"),
    ).filter(([key]) => key.startsWith("v")),
  );
  const results = [];
  for (const own of [false, true]) {
    const output = path.join(dir, (own ? "vpm" : "upstream") + ".cjs");
    esbuild.buildSync({
      entryPoints: [entry],
      outfile: output,
      bundle: true,
      platform: "node",
      format: "cjs",
      jsx: "automatic",
      alias: {
        ...vpm,
        ...alias,
        "@mui/material/Grid": own
          ? packages + "/vmui-material/Grid.mjs"
          : mat + "/Grid/index.js",
      },
      external: ["react", "react-dom"],
      define: { "process.env.NODE_ENV": '"production"' },
      logLevel: "silent",
    });
    const App = require(output).default;
    const cases = [];
    for (const sample of samples) {
      globalThis.yearList = sample;
      const markup = render(h(App, {}))
        .replace(/<style[\s\S]*?<\/style>/g, "")
        .replace(/\bcss-[\w-]+/g, "");
      assert.equal(
        (markup.match(/MuiGrid-grid-md-4/g) || []).length,
        sample.loading ? 9 : sample.years.length,
      );
      for (const { year } of sample.years) {
        assert.ok(
          markup.includes(
            'aria-label="View the ' +
              year +
              ' International Mathematical Olympiad"',
          ),
        );
        assert.ok(
          markup.includes(
            "/imo-logos/" + year + (year >= 2015 ? ".png" : ".gif"),
          ),
        );
      }
      cases.push(markup);
    }
    results.push(cases);
  }
  assert.deepEqual(results[0], results[1]);
  console.log(
    "Unchanged IMO archive matches app Material for loading, populated, empty and error states, year actions and logo URLs.",
  );
} finally {
  delete globalThis.yearList;
  fs.rmSync(dir, { recursive: true, force: true });
  esbuild.stop();
}
