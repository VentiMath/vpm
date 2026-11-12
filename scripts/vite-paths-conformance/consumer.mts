import tsconfigPaths, {
  type PluginOptions,
  type PathPlugin,
} from "vvite-tsconfig-paths";
const options: PluginOptions = {
  parseNative: false,
  root: ".",
  projects: ["."],
  skip: (name) => name === "fixtures",
};
const plugin: PathPlugin = tsconfigPaths(options);
void plugin;
// @ts-expect-error compiler mode is outside the declared contract
void tsconfigPaths({ parseNative: true });
// @ts-expect-error unknown discovery mode
void tsconfigPaths({ projectDiscovery: "all" });
