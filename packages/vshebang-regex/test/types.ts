import shebang = require('../index.cjs');
const expression: RegExp = shebang;
const match: RegExpExecArray | null = expression.exec('#!/bin/sh');
void match;
// @ts-expect-error exports a RegExp, not a callable factory
shebang();
