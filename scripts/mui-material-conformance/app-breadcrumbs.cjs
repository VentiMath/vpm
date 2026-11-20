const fs = require("fs"),
  path = require("path"),
  assert = require("assert/strict"),
  cp = require("child_process");
const { fixture, packages, esbuild, peer } = require("./paths.cjs");
if (!process.argv[2]) throw new Error("Pass a VentiMath checkout and optional Git ref");
const app = path.resolve(process.argv[2]);
const source = cp.execFileSync(
  "git",
  ["show", (process.argv[3] || "origin/main") + ":src/components/PageBreadcrumb.tsx"],
  { cwd: app, encoding: "utf8" },
);
const dir = fs.mkdtempSync(fixture + "/node_modules/.actual-breadcrumb-");
try {
  const file = (name, text) => {
    const p = dir + "/" + name;
    fs.writeFileSync(p, text);
    return p;
  };
  const route = file("route.js", "export default ()=>global.__route");
  const nav = file(
    "nav.js",
    'export default ()=>({data:[{url:"/contests",title:"Contests",children:[{url:"/contests/aime",title:"AIME"},{url:"/contests/aime/exams",title:"AIME"}]}]})',
  );
  const link = file(
    "link.jsx",
    'import React from "react";export default React.forwardRef(({to,...p},ref)=><a href={to} ref={ref} {...p}/>);',
  );
  fs.mkdirSync(dir + "/theme-layouts/components/navigation/hooks", { recursive: true });
  fs.copyFileSync(nav, dir + "/theme-layouts/components/navigation/hooks/useNavigationItems.js");
  const main = file("app.tsx", source);
  const runs = [];
  for (const own of [false, true]) {
    const aliases = require("../mui-system-conformance/aliases.cjs")(own, "app");
    const mat = aliases["@mui/material"];
    const alias = {
      ...aliases,
      "@fuse/hooks/usePathname": route,
      "@fuse/core/Link": link,
      clsx: packages + "/vclsx/index.cjs",
    };
    for (const name of ["Typography", "Breadcrumbs"])
      alias["@mui/material/" + name] = own
        ? packages + "/vmui-material/" + name + ".mjs"
        : mat + "/" + name + "/index.js";
    const out = dir + "/" + own + ".cjs";
    esbuild.buildSync({
      entryPoints: [main],
      outfile: out,
      bundle: true,
      format: "cjs",
      platform: "node",
      jsx: "automatic",
      alias,
      external: ["react", "react-dom"],
      define: { "process.env.NODE_ENV": '"production"' },
      logLevel: "silent",
    });
    const App = require(out).default,
      html = peer("react-dom/server").renderToString,
      h = peer("react").createElement;
    const rows = [];
    for (const [url, props, expected] of [
      [
        "/contests/aime/exams",
        {},
        { links: ["Home", "Contests", "AIME"], last: "/contests/aime/exams" },
      ],
      [
        "/academy/people/1234567890123456789/scores",
        { skipHome: true, lastLabel: "Ada Lovelace" },
        {
          links: ["academy", "people", "Ada Lovelace"],
          last: "/academy/people/1234567890123456789/scores",
        },
      ],
      [
        "/academy/research/publications/series/overview",
        {},
        {
          links: ["Home", "overview"],
          last: "/academy/research/publications/series/overview",
          button: true,
        },
      ],
    ]) {
      global.__route = url;
      const markup = html(h(App, props)).replace(/<style[\s\S]*?<\/style>/g, "");
      const links = [...markup.matchAll(/<a\b([^>]+)>(.*?)<\/a>/g)].map((m) => [
        m[2],
        m[1].match(/href="([^"]*)"/)[1],
      ]);
      assert.deepEqual(
        links.map((x) => x[0]),
        expected.links,
      );
      assert.equal(links.at(-1)[1], expected.last);
      assert.equal(markup.includes('aria-label="Show path"'), !!expected.button);
      rows.push(links);
    }
    runs.push(rows);
  }
  assert.deepEqual(...runs);
  console.log(
    "Unchanged VentiMath PageBreadcrumb matches app Material for AIME aliases, hidden document IDs, stored names, hrefs and long-path collapse",
  );
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
  esbuild.stop();
}
