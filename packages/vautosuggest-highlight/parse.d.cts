declare namespace parse {
  interface Part {
    text: string;
    highlight: boolean;
  }
}
declare function parse(
  text: string,
  matches: readonly (readonly [number, number])[],
): parse.Part[];
export = parse;
