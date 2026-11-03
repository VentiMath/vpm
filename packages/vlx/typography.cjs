'use strict';
// Prose punctuation only. Mathematical apostrophes are handled by the parser.
function typography(value) {
 return value.replace(/---/g,'—').replace(/--/g,'–')
  .replace(/(^|[\s([{])"/g,'$1“').replace(/"/g,'”')
  .replace(/(^|[\s([{])'/g,'$1‘').replace(/'/g,'’');
}
exports.typography=typography;
