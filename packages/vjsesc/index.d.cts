declare namespace jsesc {
  interface Options {
    quotes?: "single" | "double" | "backtick";
    numbers?: "decimal" | "binary" | "octal" | "hexadecimal";
    wrap?: boolean;
    es6?: boolean;
    escapeEverything?: boolean;
    minimal?: boolean;
    json?: boolean;
    lowercaseHex?: boolean;
    isScriptContext?: boolean;
  }
}
declare function jsesc(value: string | number, options?: jsesc.Options): string;
export = jsesc;
