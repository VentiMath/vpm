// Development: a label for css prop styles from the component that renders
// them, read from a stack trace (opt in with globalThis.EMOTION_RUNTIME_AUTO_LABEL).

const lastPart = name => name.slice(name.lastIndexOf('.') + 1); // Object.render -> render

function functionName(line) {
  // V8: "    at Name (...)"; Safari and Firefox: "Name@..."
  const match = /^\s+at\s+([A-Za-z0-9$.]+)\s/.exec(line) || /^([A-Za-z0-9$.]+)@/.exec(line);
  return match ? lastPart(match[1]) : undefined;
}

// Past these, the stack is React's, not the component's.
const REACT_INTERNALS = new Set(['renderWithHooks', 'processChild', 'finishClassComponent', 'renderToString']);

/**
 * The first function in the stack named like a component (an upper-case
 * initial), with $ (valid in names, not in class names) as -.
 * @param {string | undefined} stack
 */
export function getLabelFromStackTrace(stack) {
  if (!stack) return undefined;
  for (const line of stack.split('\n')) {
    const name = functionName(line);
    if (!name) continue;
    if (REACT_INTERNALS.has(name)) break;
    if (/^[A-Z]/.test(name)) return name.replace(/\$/g, '-');
  }
  return undefined;
}
