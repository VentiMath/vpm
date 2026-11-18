import parser = require('../index.cjs');
const parsed: parser.ParsedValue = parser('color(display-p3 1 0 0)');
parsed.walk(node => { if (node.type === 'function') node.nodes.forEach(child => child.value); });
const serialized: string = parser.stringify(parsed.nodes);
const dimension: parser.Dimension | false = parser.unit('2px');
// @ts-expect-error values must be strings
parser(2);
void [serialized, dimension];
