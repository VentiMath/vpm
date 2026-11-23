import isWsl from '../index.cjs';
const detected: boolean = isWsl;
// @ts-expect-error the public API is a boolean, not a function
isWsl();
void detected;
