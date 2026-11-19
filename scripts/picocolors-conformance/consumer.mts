import pc,{createColors,isColorSupported} from 'vpicocolors';
const text:string=pc.bold(pc.red(12));const support:boolean=isColorSupported;
createColors(false).bgWhiteBright(undefined);
// @ts-expect-error formatters require a value
pc.red();
// @ts-expect-error no unlisted colors
pc.orange('x');
