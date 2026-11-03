"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  http = require("node:http"),
  { spawn } = require("node:child_process");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "varia-browser-"));
const chrome =
  process.env.CHROME_BIN ||
  [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].find((p) => fs.existsSync(p));
assert(chrome, "Chrome required; set CHROME_BIN");
const bundles = new Map();
for (const [name, file] of [
  ["original", require.resolve("aria-hidden")],
  ["vpm", path.resolve(__dirname, "../../packages/varia-hidden/index.cjs")],
])
  bundles.set(
    "/" + name + ".js",
    require("esbuild").buildSync({
      stdin: {
        contents: `const api=require(${JSON.stringify(file)});export const {hideOthers,inertOthers,supportsInert,suppressOthers}=api`,
        resolveDir: __dirname,
      },
      bundle: true,
      write: false,
      platform: "browser",
      format: "esm",
    }).outputFiles[0].text,
  );
let server;
(async () => {
  try {
    const html = `<!doctype html><body><script type="module">
 const results=[];
 try {for(const name of ['original','vpm']){
 const api=await import('/'+name+'.js');const host=document.createElement('main');host.innerHTML='<button id="outside">outside</button><section id="inside"><button id="keep">inside</button></section><div aria-live="polite">status</div>';document.body.append(host);const outside=host.querySelector('#outside'),inside=host.querySelector('#inside'),keep=host.querySelector('#keep'),live=host.querySelector('[aria-live]');
 const check=(ok,msg)=>{if(!ok)throw Error(name+': '+msg)};check(api.supportsInert(),'native inert support');keep.focus();const undo=api.suppressOthers(inside,host);outside.focus();check(document.activeElement===keep,'inert blocks outside focus');check(outside.inert&&live.inert,'inert siblings');undo();outside.focus();check(document.activeElement===outside,'cleanup restores focusability');
 const unhide=api.hideOthers(inside,host);check(outside.getAttribute('aria-hidden')==='true'&&!live.hasAttribute('aria-hidden'),'ARIA and live region');unhide();check(!host.querySelector('[aria-hidden]'),'ARIA cleanup');host.remove();results.push(name);
 }}catch(e){results.push({error:e.stack})}
 document.body.innerHTML='';const pre=document.createElement('pre');pre.id='result';pre.textContent=JSON.stringify(results);document.body.append(pre);
 </script>`;
    server = http.createServer((req, res) => {
      res.setHeader(
        "Content-Type",
        req.url === "/" ? "text/html" : "text/javascript",
      );
      res.end(req.url === "/" ? html : bundles.get(req.url) || "");
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const text = await new Promise((resolve, reject) => {
      const child = spawn(chrome, [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--no-proxy-server",
        "--user-data-dir=" + path.join(temp, "profile"),
        "--dump-dom",
        "--virtual-time-budget=10000",
        "http://127.0.0.1:" + server.address().port,
      ]);
      let out = "",
        err = "";
      const timer = setTimeout(() => child.kill(), 45000);
      child.stdout.on("data", (x) => (out += x));
      child.stderr.on("data", (x) => (err += x));
      child.on("error", reject);
      child.on("close", (code) => {
        clearTimeout(timer);
        code === 0 ? resolve(out) : reject(Error(err));
      });
    });
    const encoded = text.match(/<pre id="result">(.*?)<\/pre>/s)?.[1];
    assert(encoded, text);
    const results = JSON.parse(
      encoded
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&amp;", "&"),
    );
    assert.deepEqual(results, ["original", "vpm"]);
    console.log(
      "Chrome original/VPM: native inert blocks focus, cleanup restores focusability, ARIA live regions stay exposed.",
    );
  } finally {
    if (server) await new Promise((r) => server.close(r));
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
