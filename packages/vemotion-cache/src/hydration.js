export function readHydration(document, key) {
  const nodes = [], names = [];
  for (const node of document.querySelectorAll('style[data-emotion]')) {
    const identity = node.getAttribute('data-emotion');
    if (!identity.includes(' ')) continue;
    if (key === 'css' && !node.hasAttribute('data-s')) {
      document.head.appendChild(node);
      node.setAttribute('data-s', '');
    }
    if (identity.startsWith(key + ' ')) {
      nodes.push(node);
      names.push(...identity.slice(key.length + 1).split(' ').filter(Boolean));
    }
  }
  return {nodes, names};
}
