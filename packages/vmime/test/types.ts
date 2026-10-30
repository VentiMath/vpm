import mime, {Mime} from 'vmime';
import lite from 'vmime/lite';
import standard from 'vmime/types/standard.js';
const instance: Mime = new Mime(standard,{'text/custom':['custom'] as const});
const type:string|null=mime.getType('file.txt');
const extension:string|null=lite.getExtension('text/plain');
const all:Set<string>|null=instance.getAllExtensions('text/plain');
instance.define({'text/custom':['custom','other']},true);
void type;void extension;void all;
// @ts-expect-error mappings must contain extension arrays
instance.define({'text/a':'txt'});
// @ts-expect-error exported tables are deeply readonly
standard['text/plain'].push('bad');
// @ts-expect-error library lookup takes strings
mime.getType(42);
