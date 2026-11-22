import tokens, { matchToToken, type Token } from "vjs-tokens";
const match = tokens.exec("const score = 12;");
if (match) {
  const token: Token = matchToToken(match);
  const text: string = token.value;
  const closed: boolean | undefined = token.closed;
  void [text, closed];
}
// @ts-expect-error A raw string has no RegExp capture groups.
matchToToken("score");
