'use strict';

const { isName } = require("./util.js");

const defaultOptions = {
  allowBooleanAttributes: false, //A tag can have attributes without any value
  unpairedTags: []
};

//const tagsPattern = new RegExp("<\\/?([\\w:\\-_\.]+)\\s*\/?>","g");
function validate(xmlData, options) {
  if (typeof xmlData !== 'string') throw new TypeError('XMLValidator requires a string');
  options = Object.assign({}, defaultOptions, options);

  //xmlData = xmlData.replace(/(\r\n|\n|\r)/gm,"");//make it single line
  //xmlData = xmlData.replace(/(^\s*<\?xml.*?\?>)/g,"");//Remove XML starting tag
  //xmlData = xmlData.replace(/(<!DOCTYPE[\s\w\"\.\/\-\:]+(\[.*\])*\s*>)/g,"");//Remove DOCTYPE
  const tags = [];
  let tagFound = false;

  //indicates that the root tag has been closed (aka. depth 0 has been reached)
  let reachedRoot = false;

  if (xmlData[0] === '\ufeff') {
    // check for byte order mark (BOM)
    xmlData = xmlData.substr(1);
  }

  for (let i = 0; i < xmlData.length; i++) {

    if (xmlData[i] === '<' && xmlData[i + 1] === '?') {
      i += 2;
      i = readPI(xmlData, i);
      if (i.err) return i;
    } else if (xmlData[i] === '<') {
      //starting of tag
      //read until you reach to '>' avoiding any '>' in attribute value
      let tagStartPos = i;
      i++;

      if (xmlData[i] === '!') {
        i = readCommentAndCDATA(xmlData, i);
        if (i.err) return i;
        continue;
      } else {
        let closingTag = false;
        if (xmlData[i] === '/') {
          //closing tag
          closingTag = true;
          i++;
        }
        //read tagname
        const nameStart = i;
        for (; i < xmlData.length &&
          xmlData[i] !== '>' &&
          xmlData[i] !== ' ' &&
          xmlData[i] !== '\t' &&
          xmlData[i] !== '\n' &&
          xmlData[i] !== '\r'; i++
        ) {
          // Scan the name once, then slice.
        }
        let tagName = xmlData.slice(nameStart, i);
        //console.log(tagName);

        if (tagName[tagName.length - 1] === '/') {
          //self closing tag without attributes
          tagName = tagName.substring(0, tagName.length - 1);
          //continue;
          i--;
        }
        if (!validateTagName(tagName)) {
          let msg;
          if (tagName.trim().length === 0) {
            msg = "Invalid space after '<'.";
          } else {
            msg = "Tag '" + tagName + "' is an invalid name.";
          }
          return getErrorObject('InvalidTag', msg, getLineNumberForPosition(xmlData, i));
        }

        const result = readAttributeStr(xmlData, i);
        if (result === false) {
          return getErrorObject('InvalidAttr', "Attributes for '" + tagName + "' have open quote.", getLineNumberForPosition(xmlData, i));
        }
        if (!closingTag && reachedRoot) return getErrorObject('InvalidXml', 'Multiple possible root nodes found.', getLineNumberForPosition(xmlData, tagStartPos));
        let attrStr = result.value;
        i = result.index;

        if (attrStr[attrStr.length - 1] === '/') {
          //self closing tag
          if (!result.tagClosed) return getErrorObject('InvalidTag', 'Tag is not closed.', getLineNumberForPosition(xmlData, tagStartPos));
          if (closingTag) return getErrorObject('InvalidTag', 'Closing tag cannot be self-closing.', getLineNumberForPosition(xmlData, tagStartPos));
          if (tags.length === 0) reachedRoot = true;
          const attrStrStart = i - attrStr.length;
          attrStr = attrStr.substring(0, attrStr.length - 1);
          const isValid = validateAttributeString(attrStr, options);
          if (isValid === true) {
            tagFound = true;
            //continue; //text may presents after self closing tag
          } else {
            //the result from the nested function returns the position of the error within the attribute
            //in order to get the 'true' error line, we need to calculate the position where the attribute begins (i - attrStr.length) and then add the position within the attribute
            //this gives us the absolute index in the entire xml, which we can use to find the line at last
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, attrStrStart + isValid.err.line));
          }
        } else if (closingTag) {
          if (!result.tagClosed) {
            return getErrorObject('InvalidTag', "Closing tag '" + tagName + "' doesn't have proper closing.", getLineNumberForPosition(xmlData, i));
          } else if (attrStr.trim().length > 0) {
            return getErrorObject('InvalidTag', "Closing tag '" + tagName + "' can't have attributes or invalid starting.", getLineNumberForPosition(xmlData, tagStartPos));
          } else if (tags.length === 0) {
            return getErrorObject('InvalidTag', "Closing tag '" + tagName + "' has not been opened.", getLineNumberForPosition(xmlData, tagStartPos));
          } else {
            const otg = tags.pop();
            if (tagName !== otg.tagName) {
              let openPos = getLineNumberForPosition(xmlData, otg.tagStartPos);
              return getErrorObject('InvalidTag',
                "Expected closing tag '" + otg.tagName + "' (opened in line " + openPos.line + ", col " + openPos.col + ") instead of closing tag '" + tagName + "'.",
                getLineNumberForPosition(xmlData, tagStartPos));
            }

            //when there are no more tags, we reached the root level.
            if (tags.length == 0) {
              reachedRoot = true;
            }
          }
        } else {
          const isValid = validateAttributeString(attrStr, options);
          if (isValid !== true) {
            //the result from the nested function returns the position of the error within the attribute
            //in order to get the 'true' error line, we need to calculate the position where the attribute begins (i - attrStr.length) and then add the position within the attribute
            //this gives us the absolute index in the entire xml, which we can use to find the line at last
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, i - attrStr.length + isValid.err.line));
          }

          //if the root level has been reached before ...
          if (reachedRoot === true) {
            return getErrorObject('InvalidXml', 'Multiple possible root nodes found.', getLineNumberForPosition(xmlData, i));
          } else if (options.unpairedTags.indexOf(tagName) !== -1) {
            //don't push into stack
          } else {
            tags.push({ tagName, tagStartPos });
          }
          tagFound = true;
        }

        //skip tag text value
        //It may include comments and CDATA value
        for (i++; i < xmlData.length; i++) {
          if (xmlData[i] === '<') {
            if (xmlData[i + 1] === '!') {
              //comment or CADATA
              i++;
              i = readCommentAndCDATA(xmlData, i);
              if (i.err) return i;
              continue;
            } else if (xmlData[i + 1] === '?') {
              i = readPI(xmlData, i + 2);
              if (i.err) return i;
            } else {
              break;
            }
          } else if (xmlData[i] === '&') {
            const afterAmp = validateAmpersand(xmlData, i);
            if (afterAmp == -1)
              return getErrorObject('InvalidChar', "char '&' is not expected.", getLineNumberForPosition(xmlData, i));
            i = afterAmp;
          } else {
            if (reachedRoot === true && !isWhiteSpace(xmlData[i])) {
              return getErrorObject('InvalidXml', "Extra text at the end", getLineNumberForPosition(xmlData, i));
            }
            if (!reachedRoot) {
              const lt = xmlData.indexOf('<', i + 1), amp = xmlData.indexOf('&', i + 1);
              const next = lt === -1 ? amp : amp === -1 ? lt : Math.min(lt, amp);
              i = (next === -1 ? xmlData.length : next) - 1;
            }
          }
        } //end of reading tag text value
        if (xmlData[i] === '<') {
          i--;
        }
      }
    } else {
      if (isWhiteSpace(xmlData[i])) {
        continue;
      }
      return getErrorObject('InvalidChar', "char '" + xmlData[i] + "' is not expected.", getLineNumberForPosition(xmlData, i));
    }
  }

  if (!tagFound) {
    return getErrorObject('InvalidXml', 'Start tag expected.', 1);
  } else if (tags.length == 1) {
    return getErrorObject('InvalidTag', "Unclosed tag '" + tags[0].tagName + "'.", getLineNumberForPosition(xmlData, tags[0].tagStartPos));
  } else if (tags.length > 0) {
    return getErrorObject('InvalidXml', "Invalid '" +
      JSON.stringify(tags.map(t => t.tagName), null, 4).replace(/\r?\n/g, '') +
      "' found.", { line: 1, col: 1 });
  }

  return true;
};

function isWhiteSpace(char) {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}
/**
 * Read Processing insstructions and skip
 * @param {*} xmlData
 * @param {*} i
 */
function readPI(xmlData, i) {
  const end = xmlData.indexOf('?>', i);
  if (end === -1) return getErrorObject('InvalidXml', 'Processing instruction is not closed.', getLineNumberForPosition(xmlData, i));
  const target = xmlData.slice(i, end).split(/[ \t\r\n]/, 1)[0];
  if (!isName(target)) return getErrorObject('InvalidXml', 'Invalid processing instruction name.', getLineNumberForPosition(xmlData, i));
  if (target.toLowerCase() === 'xml' && (target !== 'xml' || i !== 2)) {
    return getErrorObject('InvalidXml', 'XML declaration allowed only at the start of the document.', getLineNumberForPosition(xmlData, i));
  }
  return end + 1;
}

function readCommentAndCDATA(xmlData, i) {
  const error = message => getErrorObject('InvalidXml', message, getLineNumberForPosition(xmlData, i));
  if (xmlData.startsWith('!--', i)) {
    const end = xmlData.indexOf('-->', i + 3);
    if (end === -1) return error('Comment is not closed.');
    const content = xmlData.slice(i + 3, end);
    if (content.includes('--') || content.endsWith('-')) return error('Invalid double hyphen in comment.');
    return end + 2;
  }
  if (xmlData.startsWith('![CDATA[', i)) {
    const end = xmlData.indexOf(']]>', i + 8);
    return end === -1 ? error('CDATA is not closed.') : end + 2;
  }
  if (xmlData.startsWith('!DOCTYPE', i)) {
    let quote = '', depth = 1;
    for (let n = i + 8; n < xmlData.length; n++) {
      const c = xmlData[n];
      if (quote) { if (c === quote) quote = ''; }
      else if (c === '"' || c === "'") quote = c;
      else if (xmlData.startsWith('<!--', n)) {
        const end = xmlData.indexOf('-->', n + 4);
        if (end === -1) return error('DOCTYPE comment is not closed.');
        n = end + 2;
      } else if (c === '<') depth++;
      else if (c === '>' && --depth === 0) return n;
    }
    return error('DOCTYPE is not closed.');
  }
  return error('Unknown XML declaration.');
}

const doubleQuote = '"';
const singleQuote = "'";

/**
 * Keep reading xmlData until '<' is found outside the attribute value.
 * @param {string} xmlData
 * @param {number} i
 */
function readAttributeStr(xmlData, i) {
  const start = i;
  let startChar = '';
  let tagClosed = false;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === doubleQuote || xmlData[i] === singleQuote) {
      if (startChar === '') {
        startChar = xmlData[i];
      } else if (startChar !== xmlData[i]) {
        //if vaue is enclosed with double quote then single quotes are allowed inside the value and vice versa
      } else {
        startChar = '';
      }
    } else if (xmlData[i] === '>') {
      if (startChar === '') {
        tagClosed = true;
        break;
      }
    }

  }
  if (startChar !== '') {
    return false;
  }

  return {
    value: xmlData.slice(start, i),
    index: i,
    tagClosed: tagClosed
  };
}

/**
 * Walk `attrStr` once, left to right, splitting it into attribute tokens.
 *
 * This replaces a regex that used to do the same job
 * (`(\s*)([^\s=]+)(\s*=)?(\s*(['"])(([\s\S])*?)\5)?`). That regex led with an
 * optional whitespace group followed by a required "non-whitespace" group.
 * On a long run of whitespace that never resolves into an attribute name
 * (e.g. a tag with thousands of trailing spaces before `>`), the engine
 * backtracks the whitespace group one character at a time before giving up
 * and moving to the next starting position — one full backtrack per
 * position, which is quadratic in the length of the run.
 *
 * A single forward-only scan can never backtrack, so it can't be made slow
 * this way no matter how much whitespace the input contains — it's always
 * proportional to the length of the string, once.
 *
 * Each returned token mirrors the shape the old regex match array had, so
 * the validation logic below (which reads token[1]..token[6]) didn't need
 * to change:
 *   token.startIndex - where this token begins in attrStr
 *   token[1]          - leading whitespace before the name
 *   token[2]          - the attribute name
 *   token[3]          - whitespace + '=' if present, else undefined
 *   token[4]          - marker (any defined value) if a quoted value was found
 *   token[5]          - the quote character used ('"' or "'")
 *   token[6]          - the value's text, without the surrounding quotes
 *
 * A stray '=' produces an invalid token immediately, including after long
 * whitespace runs. Malformed input cannot trigger a quadratic rescan.
 */
function scanAttributeTokens(attrStr) {
  const tokens = [];
  const len = attrStr.length;
  let i = 0;

  while (i < len) {
    const tokenStart = i;

    // Leading whitespace before the name.
    while (i < len && isWhiteSpace(attrStr[i])) i++;
    if (i >= len) break; // trailing whitespace only — nothing left to read

    if (attrStr[i] === '=') {
      // A stray equals sign invalidates the attribute list.
      tokens.push({startIndex:i, 1:attrStr.slice(tokenStart, i), 2:'=', 3:undefined, 4:undefined});
      break;
    }

    const leadingWs = attrStr.slice(tokenStart, i);

    // Attribute name — everything up to the next whitespace or '='.
    const nameStart = i;
    while (i < len && !isWhiteSpace(attrStr[i]) && attrStr[i] !== '=') i++;
    const name = attrStr.slice(nameStart, i);

    // Optional whitespace + '='.
    let equalsGroup; // whitespace + '=' text, or undefined if absent
    let j = i;
    while (j < len && isWhiteSpace(attrStr[j])) j++;
    if (j < len && attrStr[j] === '=') {
      equalsGroup = attrStr.slice(i, j + 1);
      i = j + 1;
    }

    // Optional whitespace + quoted value.
    let quoteChar;
    let value;
    let k = i;
    while (k < len && isWhiteSpace(attrStr[k])) k++;
    if (k < len && (attrStr[k] === '"' || attrStr[k] === "'")) {
      const valueStart = k + 1;
      const closeIdx = attrStr.indexOf(attrStr[k], valueStart);
      if (closeIdx !== -1) {
        quoteChar = attrStr[k];
        value = attrStr.slice(valueStart, closeIdx);
        i = closeIdx + 1;
      }
      // No closing quote found anywhere in the rest of the string — leave
      // quoteChar/value undefined, same as the old regex's group failing
      // to match a backreference-less run.
    }

    const token = { startIndex: tokenStart };
    token[1] = leadingWs;
    token[2] = name;
    token[3] = equalsGroup;
    token[4] = quoteChar !== undefined ? true : undefined;
    token[5] = quoteChar;
    token[6] = value;
    tokens.push(token);
  }

  return tokens;
}

//attr, ="sd", a="amit's", a="sd"b="saf", ab  cd=""

function validateAttributeString(attrStr, options) {
  //console.log("start:"+attrStr+":end");

  //if(attrStr.trim().length === 0) return true; //empty string

  const matches = scanAttributeTokens(attrStr);
  const attrNames = Object.create(null);

  for (let i = 0; i < matches.length; i++) {
    if (matches[i][1].length === 0) {
      //nospace before attribute name: a="sd"b="saf"
      return getErrorObject('InvalidAttr', "Attribute '" + matches[i][2] + "' has no space in starting.", getPositionFromMatch(matches[i]))
    } else if (matches[i][3] !== undefined && matches[i][4] === undefined) {
      return getErrorObject('InvalidAttr', "Attribute '" + matches[i][2] + "' is without value.", getPositionFromMatch(matches[i]));
    } else if (matches[i][3] === undefined && !options.allowBooleanAttributes) {
      //independent attribute: ab
      return getErrorObject('InvalidAttr', "boolean attribute '" + matches[i][2] + "' is not allowed.", getPositionFromMatch(matches[i]));
    }
    /* else if(matches[i][6] === undefined){//attribute without value: ab=
                    return { err: { code:"InvalidAttr",msg:"attribute " + matches[i][2] + " has no value assigned."}};
                } */
    const value = matches[i][6];
    if (value !== undefined) {
      if (matches[i][3] === undefined || value.includes('<')) return getErrorObject('InvalidAttr', 'Invalid attribute value.', getPositionFromMatch(matches[i]));
      for (let a = value.indexOf('&'); a !== -1; a = value.indexOf('&', a + 1)) {
        const end = validateAmpersand(value, a);
        if (end === -1) return getErrorObject('InvalidAttr', 'Invalid entity reference in attribute.', getPositionFromMatch(matches[i]));
        a = end;
      }
    }
    const attrName = matches[i][2];
    if (!validateAttrName(attrName)) {
      return getErrorObject('InvalidAttr', "Attribute '" + attrName + "' is an invalid name.", getPositionFromMatch(matches[i]));
    }
    if (!Object.prototype.hasOwnProperty.call(attrNames, attrName)) {
      //check for duplicate attribute.
      attrNames[attrName] = 1;
    } else {
      return getErrorObject('InvalidAttr', "Attribute '" + attrName + "' is repeated.", getPositionFromMatch(matches[i]));
    }
  }

  return true;
}

function validateAmpersand(xmlData, i) {
  const end = xmlData.indexOf(';', i + 1);
  if (end === -1) return -1;
  const reference = xmlData.slice(i + 1, end);
  if (reference[0] !== '#') return isName(reference) ? end : -1;
  const hex = reference[1] === 'x';
  const digits = reference.slice(hex ? 2 : 1);
  if (!(hex ? /^[0-9a-fA-F]+$/ : /^[0-9]+$/).test(digits)) return -1;
  const code = Number.parseInt(digits, hex ? 16 : 10);
  // XML versions share these excluded scalar values. XML 1.0/1.1-specific
  // control-character policy is enforced by the entity decoder during parsing.
  return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) && code !== 0xfffe && code !== 0xffff ? end : -1;
}

function getErrorObject(code, message, lineNumber) {
  return {
    err: {
      code: code,
      msg: message,
      line: lineNumber.line || lineNumber,
      col: lineNumber.col,
    },
  };
}

function validateAttrName(attrName) {
  return isName(attrName);
}

// const startsWithXML = /^xml/i;

function validateTagName(tagname) {
  return isName(tagname) /* && !tagname.match(startsWithXML) */;
}

//this function returns the line number for the character at the given index
function getLineNumberForPosition(xmlData, index) {
  const lines = xmlData.substring(0, index).split(/\r?\n/);
  return {
    line: lines.length,

    // column number is last line's length + 1, because column numbering starts at 1:
    col: lines[lines.length - 1].length + 1
  };
}

//this function returns the position of the first character of match within attrStr
function getPositionFromMatch(match) {
  return match.startIndex + match[1].length;
}

exports.validate = validate;
