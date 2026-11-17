import parser, {walk,unit,stringify} from 'vpostcss-value-parser';
import convert, {type Style, getPropertyName,getStylesForProperty} from 'vcss-to-react-native';
const ast = parser('rgb(1,2,3)');
walk(ast.nodes, n => { if(n.type==='function')n.nodes.length; });
const value: string = stringify(ast.nodes);
const style: Style = convert([['font-variant','small-caps']] as const);
getStylesForProperty(getPropertyName('margin-top'),'2px');
unit('1px');
