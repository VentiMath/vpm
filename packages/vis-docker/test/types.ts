import isDocker from '../index.cjs';
const detected: boolean = isDocker();
const fromDefault: boolean = isDocker.default();
// @ts-expect-error no probe configuration API
isDocker({refresh: true});
void [detected, fromDefault];
