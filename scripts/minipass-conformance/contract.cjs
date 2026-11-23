"use strict";
const assert = require("node:assert/strict"),
  { Minipass: Own } = require("../../packages/vminipass"),
  { Minipass: Control } = require("minipass");
let state = 173,
  newSeed = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0);
function exercise(MP, operations, objectMode) {
  const s = new MP(objectMode ? { objectMode: true } : { encoding: "utf8" }),
    events = [];
  s.on("end", () => events.push(["end"]));
  s.on("drain", () => events.push(["drain"]));
  const out = [];
  for (const [op, value] of operations) {
    if (op === 0) out.push(["write", s.write(value)]);
    else if (op === 1) out.push(["read", s.read(objectMode ? undefined : 1)]);
    else if (op === 2) s.pause();
    else if (op === 3) s.resume();
    out.push(["buffer", s.bufferLength]);
  }
  s.end();
  s.resume();
  return { out, events, ended: s.emittedEnd };
}
for (let i = 0; i < 500; i++) {
  const operations = Array.from({ length: 50 }, () => [
    newSeed() % 5,
    String.fromCharCode(97 + (newSeed() % 26)),
  ]);
  for (const objects of [true, false])
    assert.deepEqual(
      exercise(Own, operations, objects),
      exercise(Control, operations, objects),
      `seed ${i} objects ${objects}`,
    );
}
console.log(
  "50,000 seeded stream operations match upstream queue lengths, reads, write return values and completion/drain events.",
);
