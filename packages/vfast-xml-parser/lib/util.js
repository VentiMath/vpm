'use strict';

const {name: isName} = require('vxml-naming');

function getAllMatches(string, regex) {
  const matches = [];
  let match = regex.exec(string);
  while (match) {
    const allmatches = [];
    allmatches.startIndex = regex.lastIndex - match[0].length;
    const len = match.length;
    for (let index = 0; index < len; index++) {
      allmatches.push(match[index]);
    }
    matches.push(allmatches);
    match = regex.exec(string);
  }
  return matches;
}

function isExist(v) {
  return typeof v !== 'undefined';
}

function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}

function getValue(v) {
  if (isExist(v)) {
    return v;
  } else {
    return '';
  }
}

/**
 * Dangerous property names that could lead to prototype pollution or security issues
 */
const DANGEROUS_PROPERTY_NAMES = [
  // '__proto__',
  // 'constructor',
  // 'prototype',
  'hasOwnProperty',
  'toString',
  'valueOf',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__'
];

const criticalProperties = ["__proto__", "constructor", "prototype"];

exports.getAllMatches = getAllMatches;
exports.isName = isName;
exports.isExist = isExist;
exports.isEmptyObject = isEmptyObject;
exports.getValue = getValue;
exports.DANGEROUS_PROPERTY_NAMES = DANGEROUS_PROPERTY_NAMES;
exports.criticalProperties = criticalProperties;
