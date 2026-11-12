export interface PluginOptions {
  root?: string;
  projects?: string[];
  loose?: boolean;
  importerFilter?: (importer: string) => boolean;
  parseNative?: false;
  ignoreConfigErrors?: boolean;
  configNames?: string[];
  skip?: (directory: string) => boolean;
  projectDiscovery?: "eager" | "lazy";
  logFile?: false;
}
export interface PathPlugin {
  name: string;
  enforce: "pre";
  configResolved(config: {
    root: string;
    logger: { warn(message: string): void };
  }): Promise<void>;
  configureServer(server: {
    watcher: {
      on(event: string, listener: (...args: any[]) => void): unknown;
      off(event: string, listener: (...args: any[]) => void): unknown;
    };
    httpServer?: { once(event: string, listener: () => void): unknown } | null;
  }): void;
  buildStart(): Promise<void>;
  watchChange(id: string): void;
  closeBundle(): void;
  resolveId(
    this: {
      resolve(
        id: string,
        importer?: string,
        options?: any,
      ): Promise<{ id: string } | string | null>;
    },
    id: string,
    importer: string | undefined,
    options?: object,
  ): Promise<string | undefined>;
}
export default function tsconfigPaths(options?: PluginOptions): PathPlugin;
