'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const createTree = require('..');
const upstream = require('../../../scripts/rbtree-conformance/node_modules/functional-red-black-tree');

// Red-black invariants and subtree counts for every reachable node.
function check(tree) {
  if (!tree.root) return;
  assert.equal(tree.root._color, 1, 'root is black');
  (function walk(node) {
    if (!node) return 1;
    if (node._color === 0) for (const child of [node.left, node.right]) assert.ok(!child || child._color === 1, 'red node has black children');
    const left = walk(node.left), right = walk(node.right);
    assert.equal(left, right, 'equal black height');
    assert.equal(node._count, 1 + (node.left ? node.left._count : 0) + (node.right ? node.right._count : 0));
    return left + node._color;
  })(tree.root);
}
const shape = node => node ? [node._color, node.key, node.value, node._count, shape(node.left), shape(node.right)] : null;
function random(seed) { return n => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) % n; }

test('ordered insertion, lookup and duplicate keys', () => {
  let tree = createTree();
  for (const key of [5, 1, 9, 3, 7, 3]) tree = tree.insert(key, 'v' + key);
  check(tree);
  assert.deepEqual(tree.keys, [1, 3, 3, 5, 7, 9]);
  assert.equal(tree.length, 6);
  assert.equal(tree.get(9), 'v9');
  assert.equal(tree.get(4), undefined);
  assert.equal(tree.find(7).index, 4);
  assert.equal(tree.remove(3).length, 5);
  assert.equal(tree.remove(4), tree);
});

test('every version is persistent across inserts, removals and updates', () => {
  const r = random(17);
  let tree = createTree((a, b) => a - b);
  const versions = [];
  for (let step = 0; step < 2000; step++) {
    const key = r(80), op = r(5);
    if (op < 2) tree = tree.insert(key, step);
    else if (op === 2) tree = tree.remove(key);
    else if (op === 3 && tree.length) tree = tree.at(r(tree.length)).remove();
    else if (tree.find(key).valid) tree = tree.find(key).update(-step);
    check(tree);
    versions.push([tree, JSON.stringify([tree.keys, tree.values])]);
  }
  for (const [version, snapshot] of versions) assert.equal(JSON.stringify([version.keys, version.values]), snapshot);
});

test('generated operations match the original tree, including node layout', () => {
  const r = random(5);
  let a = upstream((x, y) => x - y), b = createTree((x, y) => x - y);
  for (let step = 0; step < 3000; step++) {
    const key = r(50), value = 'v' + step, op = r(5);
    if (op < 2) { a = a.insert(key, value); b = b.insert(key, value); }
    else if (op === 2) { a = a.remove(key); b = b.remove(key); }
    else if (op === 3 && a.length) { const index = r(a.length); a = a.at(index).remove(); b = b.at(index).remove(); }
    else { const ia = a.ge(key), ib = b.ge(key); if (ia.valid) { a = ia.update(value); b = ib.update(value); } }
    assert.deepEqual(shape(b.root), shape(a.root));
  }
});

test('range lookups, iterators and positions', () => {
  let tree = createTree();
  for (const key of [10, 20, 30, 40]) tree = tree.insert(key, key / 10);
  const at = it => [it.valid, it.key, it.value, it.index];
  assert.deepEqual(at(tree.ge(20)), [true, 20, 2, 1]);
  assert.deepEqual(at(tree.gt(20)), [true, 30, 3, 2]);
  assert.deepEqual(at(tree.lt(20)), [true, 10, 1, 0]);
  assert.deepEqual(at(tree.le(25)), [true, 20, 2, 1]);
  assert.deepEqual(at(tree.ge(45)), [false, undefined, undefined, 4]);
  assert.deepEqual(at(tree.begin), [true, 10, 1, 0]);
  assert.deepEqual(at(tree.end), [true, 40, 4, 3]);
  const iterator = tree.begin, seen = [];
  for (; iterator.valid; iterator.next()) seen.push(iterator.key);
  assert.deepEqual(seen, [10, 20, 30, 40]);
  const back = tree.end, clone = back.clone();
  back.prev();
  assert.deepEqual([back.key, clone.key, back.hasPrev, clone.hasNext], [30, 40, true, false]);
  assert.throws(() => tree.find(99).update(1), {message: "Can't update empty node!"});
  assert.equal(tree.find(99).remove(), tree);
});

test('at() returns an invalid iterator instead of throwing or matching NaN', () => {
  assert.equal(createTree().at(0).valid, false);
  const tree = createTree().insert('a', 1).insert('b', 2);
  for (const index of [NaN, -1, 2, 0.5, Infinity, '1']) assert.equal(tree.at(index).valid, false, String(index));
  assert.deepEqual([tree.at(0).key, tree.at(1).key], ['a', 'b']);
});

test('forEach bounds, early exit and explicit undefined bounds', () => {
  let tree = createTree();
  for (const key of [1, 2, 3, 4, 5]) tree = tree.insert(key, key * 10);
  const visit = (...bounds) => { const keys = []; const result = tree.forEach(key => { keys.push(key); }, ...bounds); return [keys, result]; };
  assert.deepEqual(visit(), [[1, 2, 3, 4, 5], undefined]);
  assert.deepEqual(visit(3), [[3, 4, 5], undefined]);
  assert.deepEqual(visit(2, 4), [[2, 3], undefined]);
  assert.deepEqual(visit(4, 2), [[], undefined]);
  assert.equal(tree.forEach(key => key === 3 && 'stop'), 'stop');
  // As upstream, an explicit undefined bound is compared like any other key. The
  // default comparator orders undefined equal to everything, so a lower bound
  // admits every entry and an upper bound excludes them all.
  assert.deepEqual(visit(undefined), [[1, 2, 3, 4, 5], undefined]);
  assert.deepEqual(visit(1, undefined), [[], undefined]);
});

test('comparators: default, falsy fallbacks and non-functions', () => {
  for (const fallback of [undefined, null, 0, false, '']) assert.deepEqual(createTree(fallback).insert('b').insert('a').keys, ['a', 'b']);
  assert.throws(() => createTree(1), {name: 'TypeError', message: 'compare must be a function'});
  const reversed = createTree((a, b) => b - a).insert(1).insert(3).insert(2);
  assert.deepEqual(reversed.keys, [3, 2, 1]);
});

test('public layout and enumerability match the original', () => {
  const ours = createTree().insert(1, 'a'), theirs = upstream().insert(1, 'a');
  assert.deepEqual(Object.keys(ours), Object.keys(theirs));
  assert.deepEqual(Object.keys(ours.root).sort(), Object.keys(theirs.root).sort());
  assert.deepEqual(Object.keys(Object.getPrototypeOf(ours)), Object.keys(Object.getPrototypeOf(theirs)));
  assert.deepEqual(Object.keys(ours.begin), Object.keys(theirs.begin));
  assert.deepEqual(Object.keys(Object.getPrototypeOf(ours.begin)), Object.keys(Object.getPrototypeOf(theirs.begin)));
});

test('deep trees and module entry points', async () => {
  let tree = createTree((a, b) => a - b);
  for (let i = 0; i < 100000; i++) tree = tree.insert(i, i);
  check(tree);
  assert.equal(tree.at(99999).key, 99999);
  assert.equal(tree.keys.length, 100000);
  const esm = await import('vfunctional-red-black-tree');
  assert.equal(esm.default, createTree);
  assert.equal(require('vfunctional-red-black-tree/rbtree.js'), createTree);
});
