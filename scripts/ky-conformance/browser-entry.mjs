import { scenarios } from "./cases.mjs";
import { wire, bodyBoundaries } from "./wire-cases.mjs";
import * as upstream from "ky";
import * as app from "ky-app";
import * as vpm from "../../packages/vky/index.mjs";
import * as legacy from "../../packages/vky/legacy.mjs";
window.runKy = async () => {
  const out = [];
  for (const [a, b, old] of [
    [upstream, vpm, false],
    [app, legacy, true],
  ])
    out.push({
      upstream: {
        api: await scenarios(a, old),
        wire: await wire(a, location.origin + "/", old),
      },
      vpm: {
        api: await scenarios(b, old),
        wire: await wire(b, location.origin + "/", old),
      },
    });
  return out;
};

window.runKyBody = async () => [
  await bodyBoundaries(vpm, location.origin + "/"),
  await bodyBoundaries(legacy, location.origin + "/"),
];
