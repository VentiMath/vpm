"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { esbuild, fixture, packages, peer } = require("./paths.cjs");
if (!process.argv[2])
  throw Error("Pass a VentiMath checkout and optional Git revision");
const cwd = path.resolve(process.argv[2]),
  revision = process.argv[3] || "origin/main";
const dir = fs.mkdtempSync(
  path.join(fixture, "node_modules", ".contest-stacks-"),
);
const write = (name, source) => {
  const file = path.join(dir, name);
  fs.writeFileSync(file, source);
  return file;
};
const source = (filename, name) =>
  write(
    name,
    execFileSync("git", ["show", revision + ":src/components/" + filename], {
      cwd,
    }),
  );
const render = peer("react-dom/server").renderToStaticMarkup,
  h = peer("react").createElement;
try {
  const arml = source("ARML/ARMLHighlights.tsx", "arml.tsx"),
    warml = source("ARML/WARMLTeamPanel.tsx", "warml.tsx");
  fs.mkdirSync(path.join(dir, "mic"));
  const mic = source("MathIsCool/MathIsCoolView.tsx", "mic/view.tsx");
  source("MathIsCool/mathIsCoolPapers.ts", "mic/mathIsCoolPapers.ts");
  const palette = source("brandPalette.ts", "brandPalette.ts");
  // Keep the actual components, JSX, links and Material 7 siblings. Only their
  // external data, locale, browser storage, router and decorative icons are fixtures.
  write(
    "useContestHighlights.js",
    "export const useContestHighlights=()=>({data:{edition:'2026',unofficial:true,topTeams:[{rank:1,team:'Test team'}]}})",
  );
  const stubs = write(
    "data.js",
    `
    export const useTranslation=()=>({t:k=>k});
    export const useExamsByCompetition=()=>({data:[],loading:false});
    export const useClubMembershipsApi=()=>({memberships:[{role:globalThis.testRole,clubName:'Test team'}]});
    export const getArmlClubMembership=a=>a[0];export const isLinkablePerson=()=>false;`,
  );
  const link = write(
    "link.jsx",
    "export const Link=({to,...props})=><a href={to} {...props}/>;export default Link;",
  );
  const icon = write(
    "icon.jsx",
    "export default ()=> <svg aria-hidden='true'/>",
  );
  const appMaterial = path.dirname(peer.resolve("mui-material-app"));
  const alias = {
    "@mui/material": appMaterial,
    "react-router": link,
    "@fuse/core/Link": link,
    "react-i18next": stubs,
    "@/components/brandPalette": palette,
    "@/utils/armlMembership": stubs,
    "@/app/(control-panel)/dashboards/project/hooks/useClubMembershipsApi":
      stubs,
    "@/app/(control-panel)/services/winners": stubs,
    "@/contexts/ProblemsServiceContext": stubs,
  };
  const results = [];
  for (const own of [false, true]) {
    const outfile = path.join(dir, (own ? "own" : "up") + ".cjs");
    const baseAlias = require("../mui-system-conformance/aliases.cjs")(
      true,
      "app",
    );
    const vpm = Object.fromEntries(
      Object.entries(baseAlias).filter(([key]) => key.startsWith("v")),
    );
    esbuild.buildSync({
      stdin: {
        contents:
          "export {ARMLHighlights} from " +
          JSON.stringify(arml) +
          ";export {WARMLTeamPanel} from " +
          JSON.stringify(warml) +
          ";export {default as MathIsCoolView} from " +
          JSON.stringify(mic),
        resolveDir: dir,
      },
      alias: {
        ...vpm,
        ...alias,
        "@mui/material/Stack": own
          ? packages + "/vmui-material/Stack.mjs"
          : appMaterial + "/Stack/index.js",
        ...Object.fromEntries(
          ["OpenInNew", "Groups", "Leaderboard", "MenuBook"].map((k) => [
            "@mui/icons-material/" + k,
            icon,
          ]),
        ),
      },
      jsx: "automatic",
      platform: "node",
      format: "cjs",
      bundle: true,
      outfile,
      external: ["react", "react-dom"],
      define: {
        "process.env.NODE_ENV": '"production"',
        localStorage: "__testStorage",
      },
      banner: { js: "const __testStorage = {getItem:()=>null};" },
      logLevel: "silent",
    });
    const components = require(outfile);
    const rows = [];
    for (const [key, props, role, n] of [
      ["ARMLHighlights", { year: 2026 }, "student", 2],
      ["WARMLTeamPanel", {}, "student", 1],
      ["WARMLTeamPanel", {}, "coach", 1],
      ["MathIsCoolView", {}, "student", 1],
    ]) {
      globalThis.testRole = role;
      const html = render(h(components[key], props))
        .replace(/<style[\s\S]*?<\/style>/g, "")
        .replace(/\bcss-[\w-]+/g, "");
      assert.equal((html.match(/MuiStack-root/g) || []).length, n, key);
      const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]);
      if (key === "WARMLTeamPanel") {
        assert.ok(hrefs.includes("/apps/contests/warml"));
        assert.equal(hrefs.includes("/apps/coach-scores"), role === "coach");
      }
      if (key === "MathIsCoolView")
        assert.deepEqual(
          [...new Set(hrefs.filter((v) => v.includes("academicsarecool.com")))],
          [
            "https://academicsarecool.com",
            "https://academicsarecool.com/#/samples",
          ],
        );
      rows.push(html);
    }
    results.push(rows);
  }
  assert.deepEqual(results[0], results[1]);
  console.log(
    "Unchanged ARML highlights, WARML student and coach shortcuts, and Math Is Cool source links matched app Material.",
  );
} finally {
  delete globalThis.testRole;
  fs.rmSync(dir, { recursive: true, force: true });
  esbuild.stop();
}
