export function isIdentifierStart(codePoint: number): boolean;
export function isIdentifierChar(codePoint: number): boolean;
export function isIdentifierName(name: string): boolean;
export function isKeyword(word: string): boolean;
export function isReservedWord(word: string, inModule: boolean): boolean;
export function isStrictReservedWord(word: string, inModule: boolean): boolean;
export function isStrictBindOnlyReservedWord(word: string): boolean;
export function isStrictBindReservedWord(
  word: string,
  inModule: boolean,
): boolean;
