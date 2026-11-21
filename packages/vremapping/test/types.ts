import remap from "vremapping";
import type { LoaderContext, EncodedSourceMap } from "vremapping";
const input: EncodedSourceMap = {
  version: 3,
  names: [],
  sources: ["input.ts"],
  mappings: "AAAA",
};
const result = remap(
  [input],
  (source, ctx: LoaderContext) => {
    if (ctx.depth > 1) ctx.content = source;
    return null;
  },
  { decodedMappings: true },
);
result.toString();
// @ts-expect-error The source-map loader is synchronous.
remap(input, async () => input);
