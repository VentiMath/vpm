import pathKey = require('../index.cjs');
const result: string = pathKey({platform: 'win32', env: {Path: 'bin'}});
void result;
// @ts-expect-error environment values are strings or undefined
pathKey({env: {PATH: 1}});
