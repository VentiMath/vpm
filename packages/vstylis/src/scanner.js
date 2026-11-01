// A cursor over one source string. Every compile() and tokenize() call gets
// its own scanner, so the functions are reentrant (a plugin may compile while
// another compilation is in progress).

/** Character classes used to decide where whitespace is significant. */
export const WHITESPACE = 5; // \0 \t \n \r space
export const ISOLATE = 4; // ! + , / > @ ~ ; { }
export const COLON = 3; // :
export const OPENING = 2; // " ' ( [
export const CLOSING = 1; // ) ]
export const OTHER = 0;

/**
 * @param {number} code
 * @returns {number}
 */
export function classify(code) {
  switch (code) {
    case 0: case 9: case 10: case 13: case 32:
      return WHITESPACE;
    case 33: case 43: case 44: case 47: case 62: case 64: case 126:
    case 59: case 123: case 125:
      return ISOLATE;
    case 58:
      return COLON;
    case 34: case 39: case 40: case 91:
      return OPENING;
    case 41: case 93:
      return CLOSING;
    default:
      return OTHER;
  }
}

/** @param {number} code */
const isHexDigit = code => (code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102);

export class Scanner {
  /** @param {string} text */
  constructor(text) {
    this.text = text;
    this.position = 0;
    this.line = 1;
    this.column = 1;
    /** The last character read; 0 at the end of the input. */
    this.character = 0;
  }

  /** Reads one character; returns 0 at the end of the input. */
  next() {
    const code = this.position < this.text.length ? this.text.charCodeAt(this.position++) : 0;
    this.column++;
    if (code === 10) {
      this.column = 1;
      this.line++;
    }
    return (this.character = code);
  }

  /** The next character, without reading it (0 at the end). */
  peek() {
    return this.text.charCodeAt(this.position) | 0;
  }

  /**
   * @param {number} begin
   * @param {number} end
   */
  slice(begin, end) {
    return this.text.slice(begin, end);
  }

  /**
   * Reads past the closing character, skipping strings, nested parentheses
   * (inside parentheses) and escapes. Returns the position after it, or the
   * end of the input.
   * @param {number} close
   * @returns {number}
   */
  skipPast(close) {
    while (this.next()) {
      const code = this.character;
      if (code === close) return this.position;
      if (code === 34 || code === 39) {
        if (close !== 34 && close !== 39) this.skipPast(code);
      } else if (code === 40) {
        if (close === 41) this.skipPast(41);
      } else if (code === 92) {
        this.next();
      }
    }
    return this.position;
  }

  /**
   * The just-read opening character (a quote, `(` or `[`, or `-` for an
   * at-rule's vendor prefix) through its closing counterpart, verbatim.
   * @param {number} open
   * @returns {string}
   */
  readDelimited(open) {
    const start = this.position - 1;
    const close = open === 91 ? 93 : open === 40 ? 41 : open;
    return this.slice(start, this.skipPast(close)).trim();
  }

  /**
   * Reads from `start` while the next character is part of a name.
   * @param {number} start
   * @returns {string}
   */
  readIdentifier(start) {
    while (classify(this.peek()) === OTHER) this.next();
    return this.slice(start, this.position);
  }

  /**
   * Skips the rest of a run of whitespace. Returns the single space it
   * collapses to, or '' where whitespace has no meaning: after `previous` or
   * before the next character when either is a combinator, a delimiter, a
   * colon or the end of the input.
   * @param {number} previous
   * @returns {string}
   */
  skipWhitespace(previous) {
    let code;
    while ((code = this.peek()) && code < 33) this.next();
    return classify(previous) >= COLON || classify(code) >= ISOLATE ? '' : ' ';
  }

  /**
   * Reads an escape whose backslash is at `start`: up to six hex digits (and
   * the single space that ends them), or the escaped character.
   * @param {number} start
   * @returns {string}
   */
  readEscape(start) {
    let count = 7;
    while (--count && this.next()) {
      if (!isHexDigit(this.character)) break;
    }
    const end = this.position;
    const terminated = count < 6 && this.peek() === 32 && this.next() === 32;
    return this.slice(start, end + (terminated ? 1 : 0));
  }

  /**
   * Reads a comment after its `/`; the next character is `*` or `/`. Line
   * comments are returned in block form.
   * @returns {{text: string, block: boolean}}
   */
  readComment() {
    const block = this.next() === 42;
    const start = this.position;
    let end = this.text.length;
    let closed = false;
    while (this.next()) {
      if (block ? this.character === 42 && this.peek() === 47 : this.character === 10) {
        end = this.position - 1;
        closed = true;
        break;
      }
    }
    if (block && closed) this.next();
    return {text: '/*' + this.slice(start, end) + '*/', block};
  }
}
