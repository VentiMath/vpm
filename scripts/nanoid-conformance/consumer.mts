import {nanoid, customAlphabet, customRandom, random, urlAlphabet} from 'vnanoid';
import {nanoid as loose, customAlphabet as looseAlphabet} from 'vnanoid/non-secure';
type ID = string & {readonly brand: unique symbol};
const id: ID = nanoid<ID>();
const custom: ID = customAlphabet<ID>('abc', 6)();
const source: ID = customRandom<ID>(urlAlphabet, 6, random)();
const ordinary: string = loose();looseAlphabet('abc')(5);
// @ts-expect-error size must be numeric
nanoid('21');
// @ts-expect-error custom entropy must be bytes
customRandom('abc',6,()=>[1,2,3]);
void [id,custom,source,ordinary];
