import {
  GenMapping,
  addMapping,
  maybeAddSegment,
  fromMap,
  toEncodedMap,
  allMappings,
} from "vgen-mapping";
const gen = new GenMapping({ file: "out.js" });
addMapping(gen, {
  source: "menu.tsx",
  generated: { line: 1, column: 0 },
  original: { line: 2, column: 4 },
});
maybeAddSegment(gen, 1, 2);
allMappings(fromMap(toEncodedMap(gen)));
// @ts-expect-error A mapped source requires an original position.
addMapping(gen, { source: "menu.tsx", generated: { line: 1, column: 0 } });
