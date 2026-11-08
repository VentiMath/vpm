"use strict";
// Optional read-only verification against the private app; no app source is copied.
const { execFileSync } = require("node:child_process"),
  { createHash } = require("node:crypto"),
  assert = require("node:assert/strict");
const cwd = process.argv[2];
if (!cwd)
  throw Error("Pass the private app checkout to verify caller evidence");
const files = [
  "src/components/theme-layouts/components/configurator/Configurator.tsx",
  "src/app/(control-panel)/apps/messenger/components/views/MessengerPanel.tsx",
  "src/components/theme-layouts/components/configurator/SettingsPanel.tsx",
  "src/components/theme-layouts/components/configurator/ThemesPanel.tsx",
];
const hashes = {};
for (const file of files) {
  const source = execFileSync("git", ["show", "origin/main:" + file], {
    cwd,
    encoding: "utf8",
  });
  hashes[file] = createHash("sha256").update(source).digest("hex");
  if (file.endsWith("Configurator.tsx")) {
    assert.match(
      source,
      /onSwipedLeft: \(\) => Boolean\(open\) && theme.direction === 'rtl' && handleClose\(\)/,
    );
    assert.match(
      source,
      /onSwipedRight: \(\) => Boolean\(open\) && theme.direction === 'ltr' && handleClose\(\)/,
    );
    assert.equal(
      (source.match(/useSwipeable\(handlerOptions\)/g) || []).length,
      2,
    );
    const body = source.match(/const handlerOptions = (\{[\s\S]*?\n  \});/)[1];
    assert.equal((body.match(/onSwiped/g) || []).length, 2);
    assert.doesNotMatch(
      body,
      /preventScroll|trackMouse|delta|rotation|trackTouch/,
    );
  } else if (file.endsWith("MessengerPanel.tsx")) {
    const body = source.match(
      /const handlers = useSwipeable\((\{[\s\S]*?\n  \})\);/,
    )[1];
    assert.match(
      body,
      /open && theme.direction === 'rtl' && closeChatPanel\(\)/,
    );
    assert.match(
      body,
      /open && theme.direction === 'ltr' && closeChatPanel\(\)/,
    );
    assert.doesNotMatch(
      body,
      /preventScroll|trackMouse|delta|rotation|trackTouch/,
    );
    assert.match(source, /<HStack[\s\S]*?\{\.\.\.handlers\}/);
  } else assert.match(source, /\{\.\.\.(?:settings|schemes)Handlers\}/);
}
console.log(
  JSON.stringify(
    {
      appCommit: execFileSync("git", ["rev-parse", "origin/main"], {
        cwd,
        encoding: "utf8",
      }).trim(),
      hashes,
      contract:
        "Two direction-gated close callbacks; default touch/passive scrolling; no mouse override; refs forwarded through Dialog or HStack. Browser fixture models this contract, not complete authenticated components.",
    },
    null,
    2,
  ),
);
