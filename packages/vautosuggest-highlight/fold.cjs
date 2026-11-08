"use strict";

// Unicode decomposition supplies accent handling. These non-decomposing Latin
// letters are the small transliteration contract observed in the upstream API.
const expansions = Object.assign(Object.create(null), {
  æ: "ae",
  œ: "oe",
  ß: "ss",
  ø: "o",
  ð: "d",
  đ: "d",
  þ: "th",
  ħ: "h",
  ı: "i",
  ĳ: "ij",
  ŀ: "l",
  ł: "l",
  ŉ: "n",
  ŧ: "t",
  ſ: "s",
  ƒ: "f",
});
const ascii = /^[\x00-\x7f]*$/;
const latin = /\p{Script=Latin}/u;
const mark = /\p{M}/u;
const marks = /\p{M}/gu;
const cyrillicAccents = /^[ЁёЃѓЌќЙй]$/;

module.exports = function fold(text) {
  if (ascii.test(text)) return { value: text.toLowerCase(), offsets: null };
  let value = "";
  const offsets = [0];
  for (let i = 0; i < text.length; ) {
    const code = text.charCodeAt(i);
    if (
      code < 128 &&
      (i + 1 === text.length ||
        text.charCodeAt(i + 1) < 128 ||
        !mark.test(String.fromCodePoint(text.codePointAt(i + 1))))
    ) {
      value +=
        code >= 65 && code <= 90 ? String.fromCharCode(code + 32) : text[i];
      offsets.push(++i);
      continue;
    }
    const start = i;
    let letter = String.fromCodePoint(text.codePointAt(i));
    i += letter.length;
    if (latin.test(letter) || cyrillicAccents.test(letter)) {
      // Keep a decomposed accent attached to the source letter in returned
      // UTF-16 slices, rather than leaving its combining marks unhighlighted.
      while (i < text.length) {
        const next = String.fromCodePoint(text.codePointAt(i));
        if (!mark.test(next)) break;
        letter += next;
        i += next.length;
      }
      letter = letter.normalize("NFD").replace(marks, "").toLowerCase();
      letter = expansions[letter] || letter;
    }
    value += letter;
    for (let j = 1; j < letter.length; j++) offsets.push(start);
    offsets.push(i);
  }
  return { value, offsets };
};
