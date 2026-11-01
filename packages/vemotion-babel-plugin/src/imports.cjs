'use strict';
// Imports the plugin adds (styled's base, css for the css prop), once per
// file, placed as @babel/helper-module-imports places them: before earlier
// added imports, at the top of the program.

function insert(programPath, statement) {
  statement._blockHoist = 3;
  const target = programPath.get('body').find(path => Number.isFinite(path.node._blockHoist) && path.node._blockHoist < 4);
  if (target) target.insertBefore(statement);
  else programPath.unshiftContainer('body', statement);
}

/**
 * @returns {{type: 'Identifier', name: string}} the local name of the import
 */
exports.addImport = (state, t, source, imported, nameHint) => {
  const key = ['import', source, imported].join(':');
  if (state[key] === undefined) {
    const programPath = state.file.path;
    const local = programPath.scope.generateUidIdentifier(nameHint);
    const specifier = imported === 'default' ? t.importDefaultSpecifier(local) : t.importSpecifier(local, t.identifier(imported));
    insert(programPath, t.importDeclaration([specifier], t.stringLiteral(source)));
    state[key] = local.name;
  }
  return {type: 'Identifier', name: state[key]};
};
