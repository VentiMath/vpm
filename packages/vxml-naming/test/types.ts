import { qName, sanitize, validateAll, createValidator, type Production } from 'vxml-naming';
const production: Production='qName';
const check=createValidator(production,{maxCacheSize:12,xmlVersion:'1.1'});
const accepted: boolean=check('svg:circle'); check.reset();
const repaired:string=sanitize('1:x',production,{replacement:'_'});
const valid:boolean=validateAll([repaired],production)[0]!.valid;
qName(repaired,{asciiOnly:true});void accepted;void valid;
// @ts-expect-error invalid production
createValidator('unknown');
// @ts-expect-error strings required
qName(1);
