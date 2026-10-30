'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const file = 'unicode/DerivedNumericType.txt';
const source = fs.readFileSync(path.join(__dirname, 'upstream', file), 'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), require('./upstream/SHA256.json')[file]);
const ranges = [...source.matchAll(/^([A-F0-9]+)\.\.([A-F0-9]+)\s+; Decimal /gm)].map(m => [parseInt(m[1],16), parseInt(m[2],16)]);
const zeros = [];
for (const [start,end] of ranges) {
  assert.equal((end-start+1)%10,0);
  for (let zero=start;zero<=end;zero+=10) zeros.push(zero);
}
const pages = new Set(zeros.flatMap(zero=>[zero>>>8,(zero+9)>>>8]));
const content = `'use strict';\n// Generated from Unicode 18.0.0 DerivedNumericType.txt. Do not edit by hand.\n// Unicode-3.0 license retained in LICENSE; source and SHA-256 in the conformance fixture.\nconst zeros = [${zeros.join(',')}];\nconst pages = new Uint8Array(${(ranges.at(-1)[1]>>>8)+1});\nconst digits = new Uint8Array(${(pages.size+1)*256});\nlet count = 0;\nfor (const zero of zeros) for (let n = 0; n < 10; n++) {\n  const cp = zero + n, page = cp >>> 8;\n  if (!pages[page]) pages[page] = ++count;\n  digits[(pages[page] << 8) + (cp & 255)] = 48 + n;\n}\nexports.pages = pages;\nexports.digits = digits;\n`;
const destination = path.resolve(__dirname,'../../packages/vanynum/lib/data.js');
if(process.argv.includes('--check')) assert.equal(fs.readFileSync(destination,'utf8'),content);
else {fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,content);}
console.log(`Unicode 18.0.0: ${zeros.length*10} decimal digits, ${pages.size} compact lookup pages verified.`);
