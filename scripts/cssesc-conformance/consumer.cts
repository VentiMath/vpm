import cssesc = require('vcssesc');
const escaped:string=cssesc('w-1/2',{isIdentifier:true});
cssesc.options.quotes='double';
void escaped;
// @ts-expect-error input is text
cssesc(4);
// @ts-expect-error only two quote policies
cssesc('x',{quotes:'backtick'});
