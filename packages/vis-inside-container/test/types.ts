import inside from '../index.cjs';
const detected: boolean = inside();
const same: boolean = inside.default();
// @ts-expect-error no refresh option
inside({refresh: true});
void [detected, same];
