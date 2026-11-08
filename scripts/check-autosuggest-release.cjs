"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process"),
  { createHash } = require("node:crypto");
const directory = path.resolve(process.argv[2] || "."),
  published = process.argv.includes("--published");
const manifest = JSON.parse(
  fs.readFileSync(path.join(directory, "release-manifest.json")),
);
const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "vpm-autosuggest-release-check-"),
);
const hash = (x) => createHash("sha256").update(x).digest("hex");
const fixture = path.join(__dirname, "autosuggest-widget-conformance");
function run(command, args, cwd, extra = {}) {
  const r = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 4e6,
    env: {
      ...process.env,
      BUN_INSTALL_CACHE_DIR: path.join(cwd, "bun-cache"),
      npm_config_cache: path.join(cwd, "npm-cache"),
      ...extra,
    },
  });
  assert.ifError(r.error);
  assert.equal(r.status, 0, (r.stdout + r.stderr).slice(-14000));
  return r.stdout;
}
(async () => {
  try {
    const names = [
      "vautosuggest-highlight",
      "vreact-autosuggest",
      "vreact-themeable",
      "vsection-iterator",
      "vshallow-equal",
    ];
    assert.deepEqual(manifest.packages.map((p) => p.name).sort(), names);
    const top = manifest.packages.find((p) => p.name === "vreact-autosuggest"),
      highlight = manifest.packages.find(
        (p) => p.name === "vautosuggest-highlight",
      );
    const recipe = JSON.parse(
      fs.readFileSync(path.join(directory, "consumer-package.json")),
    );
    assert.deepEqual(recipe, {
      dependencies: {
        "react-autosuggest": top.url,
        "autosuggest-highlight": highlight.url,
      },
    });
    for (const line of fs
      .readFileSync(path.join(directory, "SHA256SUMS"), "utf8")
      .trim()
      .split("\n")) {
      const [digest, file] = line.split("  ");
      assert.equal(
        hash(fs.readFileSync(path.join(directory, file))),
        digest,
        file,
      );
    }
    if (published)
      for (const file of [
        "release-manifest.json",
        "consumer-package.json",
        "SHA256SUMS",
      ]) {
        const r = await fetch(
          "https://github.com/VentiMath/vpm/releases/download/" +
            manifest.tag +
            "/" +
            file,
        );
        assert(r.ok, file + ": " + r.status);
        assert.deepEqual(
          Buffer.from(await r.arrayBuffer()),
          fs.readFileSync(path.join(directory, file)),
        );
      }
    for (const item of manifest.packages) {
      assert.equal(
        hash(fs.readFileSync(path.join(directory, item.asset))),
        item.sha256,
        item.asset,
      );
      if (published) {
        const r = await fetch(item.url);
        assert(r.ok, item.url + ": " + r.status);
        assert.equal(
          hash(Buffer.from(await r.arrayBuffer())),
          item.sha256,
          item.url,
        );
      }
    }
    for (const manager of ["npm", "bun"]) {
      const cwd = path.join(temp, manager);
      fs.mkdirSync(cwd);
      const react = manager === "npm" ? "19.1.0" : "19.2.4";
      const dependencies = {
          react,
          "react-dom": react,
          "@types/react": "19.2.14",
          "@types/react-dom": "19.2.3",
        },
        overrides = {};
      if (published) Object.assign(dependencies, recipe.dependencies);
      else if (manager === "npm") {
        for (const item of [top, highlight])
          dependencies[manifest.installNames[item.name]] =
            "file:" + path.join(directory, item.asset);
        for (const item of manifest.packages)
          if (item !== top && item !== highlight)
            overrides[item.name] = "file:" + path.join(directory, item.asset);
      }
      fs.writeFileSync(
        path.join(cwd, "package.json"),
        JSON.stringify({
          private: true,
          type: "module",
          dependencies,
          ...(Object.keys(overrides).length ? { overrides } : {}),
        }),
      );
      run(
        manager,
        [
          "install",
          "--ignore-scripts",
          ...(manager === "npm" ? ["--no-audit", "--no-fund"] : []),
        ],
        cwd,
      );
      if (!published && manager === "bun")
        for (const item of manifest.packages) {
          const unpack = path.join(cwd, "unpack-" + item.name);
          fs.mkdirSync(unpack);
          run(
            "tar",
            ["-xzf", path.join(directory, item.asset), "-C", unpack],
            cwd,
          );
          fs.renameSync(
            path.join(unpack, "package"),
            path.join(cwd, "node_modules", manifest.installNames[item.name]),
          );
        }
      const verify = () => {
        for (const item of manifest.packages) {
          const folder = path.join(
              cwd,
              "node_modules",
              manifest.installNames[item.name],
            ),
            meta = JSON.parse(
              fs.readFileSync(path.join(folder, "package.json")),
            );
          assert.equal(meta.name, item.name);
          assert.equal(meta.version, item.version);
          assert.deepEqual(meta.dependencies || {}, item.dependencies);
          for (const [file, digest] of Object.entries(item.sourceFiles))
            assert.equal(
              hash(fs.readFileSync(path.join(folder, file))),
              digest,
              item.name + "/" + file,
            );
          for (const [name, url] of Object.entries(meta.dependencies || {}))
            assert.equal(
              url,
              manifest.packages.find((p) => p.name === name)?.url,
              "Internal dependency must be a sibling release URL",
            );
        }
        for (const name of [
          "prop-types",
          "es6-promise",
          "react-themeable",
          "section-iterator",
          "shallow-equal",
          "vreact-autosuggest",
          "vautosuggest-highlight",
        ])
          assert.equal(
            fs.existsSync(path.join(cwd, "node_modules", name)),
            false,
            "Unexpected duplicate or legacy dependency: " + name,
          );
      };
      verify();
      const entry = path.join(cwd, "node_modules/react-autosuggest");
      for (const runtime of ["node", "bun"])
        console.log(
          manager,
          react,
          run(runtime, [path.join(fixture, "run.cjs")], cwd, {
            VPM_WIDGET_ENTRY: entry,
          }).trim(),
        );
      fs.writeFileSync(
        path.join(cwd, "consumer.mjs"),
        `import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {createRequire} from 'node:module';import C from 'react-autosuggest';import match from 'autosuggest-highlight/match';import parse from 'autosuggest-highlight/parse';import * as highlight from 'autosuggest-highlight';const require=createRequire(import.meta.url);assert.equal(C,require('react-autosuggest'));assert.equal(match,require('autosuggest-highlight/match'));assert.equal(parse,highlight.parse);const text='😀 café';assert.deepEqual(match(text,'cafe'),[[3,7]]);assert.equal(parse(text,match(text,'cafe')).map(x=>x.text).join(''),text);const html=renderToStaticMarkup(React.createElement(C,{suggestions:['Navigation'],alwaysRenderSuggestions:true,inputProps:{value:'Nav',onChange(){}},getSuggestionValue:x=>x,renderSuggestion:x=>React.createElement('span',null,parse(x,match(x,'nav')).map(x=>x.text).join('')),onSuggestionsFetchRequested(){}}));assert.match(html,/role="option"/);assert.match(html,/Navigation/);`,
      );
      for (const runtime of ["node", "bun"])
        run(runtime, ["consumer.mjs"], cwd);
      fs.writeFileSync(
        path.join(cwd, "consumer.tsx"),
        fs
          .readFileSync(path.join(fixture, "public-types.tsx"), "utf8")
          .replaceAll("vreact-autosuggest", "react-autosuggest"),
      );
      fs.writeFileSync(
        path.join(cwd, "highlight.mts"),
        fs
          .readFileSync(
            path.join(__dirname, "autosuggest-conformance/public-types.ts"),
            "utf8",
          )
          .replaceAll("vautosuggest-highlight", "autosuggest-highlight"),
      );
      fs.writeFileSync(
        path.join(cwd, "consumer.cts"),
        `import C=require('react-autosuggest');import match=require('autosuggest-highlight/match');const ref:C<string>|undefined=undefined;match('abc','a');`,
      );
      for (const mode of ["NodeNext", "Bundler"]) {
        fs.writeFileSync(
          path.join(cwd, "tsconfig.json"),
          JSON.stringify({
            compilerOptions: {
              strict: true,
              noEmit: true,
              target: "ES2022",
              module: mode === "Bundler" ? "Preserve" : mode,
              moduleResolution: mode,
              jsx: "react-jsx",
              lib: ["ES2022", "DOM"],
              types: ["react", "react-dom"],
            },
            files: ["consumer.tsx", "consumer.cts", "highlight.mts"],
          }),
        );
        run(
          "node",
          [
            require("./platform-types.cjs").compiler().path,
            "-p",
            "tsconfig.json",
          ],
          cwd,
        );
      }
      // The VPM side uses ordinary upstream-name imports from this clean consumer.
      // Only the comparison oracle is loaded from the pinned development fixture.
      let browser = fs
        .readFileSync(path.join(fixture, "browser-entry.cjs"), "utf8")
        .replace(
          'require("react-autosuggest")',
          "require(" +
            JSON.stringify(
              require.resolve(
                "./autosuggest-widget-conformance/node_modules/react-autosuggest",
              ),
            ) +
            ")",
        )
        .replace('require("vpm-under-test")', 'require("react-autosuggest")');
      browser += `\nconst highlight=require('autosuggest-highlight');if(JSON.stringify(highlight.match('😀 café','cafe'))!=='[[3,7]]')throw Error('Release highlight mismatch');`;
      fs.writeFileSync(path.join(cwd, "browser-entry.cjs"), browser);
      fs.writeFileSync(
        path.join(cwd, "entry.mjs"),
        `import './browser-entry.cjs';`,
      );
      fs.writeFileSync(
        path.join(cwd, "build.cjs"),
        `(async()=>{const result=await Bun.build({entrypoints:['./entry.mjs'],target:'browser',format:'iife',plugins:[{name:'dedupe-react-control',setup(build){build.onResolve({filter:/^(react|react-dom(?:\\/.*)?)$/},({path:id})=>({path:require.resolve(id)}));}}]});if(!result.success)throw Error(result.logs.join('\\n'));await Bun.write('bundle.js',result.outputs[0]);})().catch(e=>{console.error(e);process.exitCode=1});`,
      );
      run("bun", ["build.cjs"], cwd);
      console.log(
        manager,
        react,
        run("node", [path.join(fixture, "browser.cjs"), cwd], cwd).trim(),
      );
      if (published) {
        const lock = path.join(
            cwd,
            manager === "npm" ? "package-lock.json" : "bun.lock",
          ),
          before = fs.readFileSync(lock);
        for (const item of manifest.packages)
          assert(
            before.toString().includes(item.url),
            "Lock must pin " + item.name,
          );
        run(
          manager,
          manager === "npm"
            ? ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]
            : ["install", "--frozen-lockfile", "--ignore-scripts"],
          cwd,
        );
        assert.deepEqual(fs.readFileSync(lock), before);
        verify();
        for (const runtime of ["node", "bun"])
          run(runtime, ["consumer.mjs"], cwd);
      }
    }
    console.log(
      (published
        ? "Published bytes and fresh/frozen root-URL installs without overrides"
        : "Prepublication npm installs and exact extracted Bun archives") +
        ": five packages, Node/Bun CJS/ESM/SSR, TS7, React19.1/19.2 and Chrome verified.",
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
