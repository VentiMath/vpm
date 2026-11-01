import {isElement, isValidElementType, typeOf, Fragment} from 'vreact-is';
const valid: boolean=isValidElementType('div');const element:boolean=isElement({});const tag:symbol|undefined=typeOf({});const fragment:symbol=Fragment;void [valid,element,tag,fragment];
