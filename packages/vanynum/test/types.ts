import anynum, {anynum as normalize} from 'vanynum';
const text:string=normalize('१२');
const unchanged:{x:number}=anynum({x:1});
const missing:undefined=anynum(undefined);
// @ts-expect-error normalized text cannot retain the input literal type
const literal:'१२'=anynum('१२');
void [text,unchanged,missing,literal];
