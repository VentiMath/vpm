import cssesc = require('../index.cjs');
const result:string=cssesc('math',{isIdentifier:true});void result;
// @ts-expect-error input must be text
cssesc(1);
