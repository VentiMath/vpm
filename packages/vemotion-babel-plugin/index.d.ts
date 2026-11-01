/** The Babel plugin: plugins: [['vemotion-babel-plugin', options]] or [plugin, options]. */
declare function emotionBabelPlugin(babel: unknown, options: emotionBabelPlugin.EmotionBabelPluginOptions): {name: string; manipulateOptions: (...args: any[]) => void; visitor: Record<string, unknown>};

declare namespace emotionBabelPlugin {
  /** An export of a package that re-exports Emotion's (importMap). */
  interface ImportMapEntry {
    /** The Emotion package and export it is, e.g. ['@emotion/react', 'css']. */
    canonicalImport: [string, string];
    /** For a re-exported styled: the base import to use instead, [source, export]. */
    styledBaseImport?: [string, string];
    [option: string]: unknown;
  }

  interface EmotionBabelPluginOptions {
    /** Labels in class names: in development (default), always or never. */
    autoLabel?: 'dev-only' | 'always' | 'never';
    /** [local], [filename] and [dirname], or a function of the name and file path. */
    labelFormat?: string | ((label: {name: string; path: string}) => string);
    /** Inline source maps in development (default true). */
    sourceMap?: boolean;
    /** Compile static css props at build time (default true). */
    cssPropOptimization?: boolean;
    /** Packages that re-export Emotion's exports: source -> export name -> entry. */
    importMap?: Record<string, Record<string, ImportMapEntry>>;
  }
}

export = emotionBabelPlugin;
