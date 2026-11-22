export interface Token {
  type:
    | "string"
    | "comment"
    | "regex"
    | "number"
    | "name"
    | "punctuator"
    | "whitespace"
    | "invalid";
  value: string;
  closed: boolean | undefined;
}
declare const tokens: RegExp;
export default tokens;
export function matchToToken(match: RegExpExecArray): Token;
