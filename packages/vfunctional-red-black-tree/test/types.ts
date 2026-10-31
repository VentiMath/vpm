import createTree = require('vfunctional-red-black-tree');
const tree: createTree.Tree<string, number> = createTree<string, number>((a, b) => a.localeCompare(b)).insert('a', 1);
const iterator: createTree.Iterator<string, number> = tree.find('a');
const next: createTree.Tree<string, number> = iterator.valid ? iterator.update(2) : tree.remove('a');
const value: number | undefined = next.get('a');
const node: createTree.Node<string, number> | null = next.root;
const keys: string[] = next.keys;
const stopped: string | undefined = next.forEach((key) => key === 'a' ? key : undefined, 'a', 'z');
// @ts-expect-error keys follow the tree's key type
tree.insert(1, 2);
void [value, node, keys, stopped, createTree()];
