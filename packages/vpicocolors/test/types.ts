import pc = require('../index.cjs');
const text:string=pc.bold(pc.red(12));const support:boolean=pc.isColorSupported;
pc.createColors(false).bgWhiteBright(undefined);
// @ts-expect-error formatters require a value
pc.red();
// @ts-expect-error no unlisted colors
pc.orange('x');
