import parser = require('vpostcss-value-parser');
import converter = require('vcss-to-react-native');
const ast: parser.ParsedValue = new parser('red');
ast.walk((node,index,siblings) => { if(node.type==='function')node.nodes= siblings.slice(index); });
const text: string = parser.stringify(ast.nodes);
const unit: parser.Dimension | false = parser.unit('2px');
const style: converter.Style = converter.default([['margin','1px']] as const);
const primitive: converter.StyleValue = [true, null, undefined, {width:1}];

const raw: string | number | boolean | null | undefined = converter.transformRawValue("width", "2px");
// @ts-expect-error raw values are CSS strings
converter.transformRawValue("width", 2);
