declare namespace match {
  interface Options {
    insideWords?: boolean;
    findAllOccurrences?: boolean;
    requireMatchAll?: boolean;
  }
  type Range = [number, number];
}
declare function match(
  text: string,
  query: string,
  options?: match.Options,
): match.Range[];
export = match;
