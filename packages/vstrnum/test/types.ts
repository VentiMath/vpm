import number from 'vstrnum';
const parsed:string|number|null=number('12',{unicode:true,leadingZeros:false,infinity:'null',skipLike:/x/});
const unchanged:{x:number}=number({x:1});
const nullValue:null=number(null);
// @ts-expect-error parsing can return the original string or null
const numeric:number=number('12');
// @ts-expect-error flags are boolean
number('1',{hex:'yes'});
// @ts-expect-error pattern must provide a test method
number('1',{skipLike:'x'});
void [parsed,unchanged,nullValue,numeric];
