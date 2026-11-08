export declare namespace HighlightWords {
  interface Chunk {
    key: string;
    text: string;
    match: boolean;
  }
  interface Options {
    text: string;
    query: string | RegExp;
    clipBy?: number | null;
    matchExactly?: boolean;
  }
  interface Clip {
    curr: Chunk;
    next?: Chunk;
    prev?: Chunk;
    clipBy?: number;
  }
  interface Query {
    terms: string | RegExp;
    matchExactly?: boolean;
  }
}
declare function highlightWords(
  options: Readonly<HighlightWords.Options>,
): HighlightWords.Chunk[];
export default highlightWords;
