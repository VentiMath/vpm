'use strict';

function shallowEqualArrays(left, right) {
  if (left === right) return true;
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  for (let index = 0; index < left.length; index++) if (left[index] !== right[index]) return false;
  return true;
}

function shallowEqualObjects(left, right) {
  if (left === right) return true;
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  for (const key of keys) {
    // Check ownership before reading: an inherited accessor is not a value to compare.
    if (!Object.hasOwn(right, key) || left[key] !== right[key]) return false;
  }
  return true;
}

function shallowEqual(left, right) {
  if (Array.isArray(left)) return shallowEqualArrays(left, right);
  return !Array.isArray(right) && shallowEqualObjects(left, right);
}

Object.assign(exports, {shallowEqual, shallowEqualArrays, shallowEqualObjects});
