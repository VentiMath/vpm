import {
  parse,
  find,
  findAll,
  toJson,
  TSConfckCache,
  TSConfckParseError,
  type TSConfckParseResult,
} from "vtsconfck";
const cache = new TSConfckCache();
const parsed: Promise<TSConfckParseResult> = parse("tsconfig.json", {
  cache,
  root: ".",
});
parsed.then(({ tsconfigFile, tsconfig }) => {
  const file: string | null = tsconfigFile;
  const aliases: Record<string, string[]> | undefined =
    tsconfig.compilerOptions?.paths;
  void [file, aliases];
});
const closest: Promise<string | null> = find("src/main.ts", {
  cache,
  configName: "jsconfig.json",
});
void closest;
findAll(".", {
  skip: (dir) => dir === "node_modules",
  configNames: ["tsconfig.json"],
});
JSON.parse(toJson('{"x":1,}'));
cache.clear();
const error: Error = new TSConfckParseError("bad", "PARSE_FILE", "config.json");
void error;
// @ts-expect-error parser takes a path string
parse(42);
// @ts-expect-error skip predicate receives a directory name
findAll(".", { skip: (dir: number) => true });
