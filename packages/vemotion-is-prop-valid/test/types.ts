import isPropValid from 'vemotion-is-prop-valid';
const forward: boolean = isPropValid('onClick');
// @ts-expect-error props are strings
isPropValid(1);
void forward;
