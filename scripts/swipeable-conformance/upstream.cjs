"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  Module = require("node:module");
const variant = process.argv[2] || "vpm";
const { JSDOM } = require("jsdom"),
  dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/" });
for (const name of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "Element",
  "Event",
  "MouseEvent",
  "TouchEvent",
  "Node",
  "getComputedStyle",
])
  Object.defineProperty(globalThis, name, {
    value: dom.window[name],
    configurable: true,
    writable: true,
  });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { expect } = require("expect"),
  jest = new (require("jest-mock").ModuleMocker)(globalThis),
  { SnapshotState, toMatchSnapshot } = require("jest-snapshot");
const snapshotState = new SnapshotState(
  path.join(__dirname, "node_modules/.vpm-swipeable/snapshots.snap"),
  {
    updateSnapshot: "none",
    snapshotFormat: { printBasicPrototype: true, escapeString: false },
  },
);
expect.extend({ toMatchSnapshot });
const tests = [],
  before = [],
  beforeAll = [],
  after = [];
Object.assign(globalThis, {
  expect,
  jest,
  describe: (_name, fn) => fn(),
  it: (name, fn) => tests.push({ name, fn }),
  beforeEach: (fn) => before.push(fn),
  beforeAll: (fn) => beforeAll.push(fn),
  afterEach: (fn) => after.push(fn),
  afterAll: () => {},
});
const file = path.join(
    __dirname,
    "node_modules/.vpm-swipeable",
    variant + ".cjs",
  ),
  unit = { exports: {} },
  local = Module.createRequire(file);
const api =
  variant === "upstream"
    ? require("react-swipeable")
    : require("./load.cjs")(
        process.env.VPM_SWIPEABLE_ENTRY ||
          require("node:path").resolve(
            __dirname,
            "../../packages/vreact-swipeable",
          ),
      );
vm.runInThisContext(
  "(function(require,module,exports){" + fs.readFileSync(file, "utf8") + "\n})",
  { filename: file },
)((id) => (id === "fixture-api" ? api : local(id)), unit, unit.exports);
(async () => {
  try {
    for (const fn of beforeAll) await fn();
    let count = 0;
    for (const test of tests) {
      expect.setState({
        currentTestName: "useSwipeable " + test.name,
        snapshotState,
      });
      try {
        for (const fn of before) await fn();
        await test.fn();
        count++;
      } catch (e) {
        e.message = test.name + ": " + e.message;
        throw e;
      } finally {
        for (const fn of after) await fn();
        require("@testing-library/react").cleanup();
        jest.restoreAllMocks();
      }
    }
    if (snapshotState.unmatched) throw Error("Unmatched snapshots");
    console.log(
      `${variant}: ${count} retained upstream cases pass; ${snapshotState.matched} original snapshots match.`,
    );
  } finally {
    dom.window.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
