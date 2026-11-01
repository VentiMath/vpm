import hash from 'vemotion-hash';
const name: string = hash('color:red;');
// @ts-expect-error hashes strings
hash(1);
void name;
