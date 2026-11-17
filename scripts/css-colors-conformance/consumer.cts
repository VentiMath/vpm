import colors from 'vcss-color-keywords';
const red:string=colors.red;
const alias:string=colors.cyan;
const unknown:string|undefined=colors['unknown-name'];
// @ts-expect-error values are strings
const wrong:number=colors.red;
void [red,alias,unknown,wrong];
