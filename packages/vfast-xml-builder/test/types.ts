import Builder,{Builder as Named,type XMLBuilder,type XmlBuilderOptions} from 'vfast-xml-builder';
import {Expression} from 'vpath-expression-matcher';
const opts:XmlBuilderOptions={stopNodes:[new Expression('..raw')],maxNestedTags:20,jPath:false,ignoreAttributes:(name,path)=>typeof path==='string'?path==='r':path.getDepth()>3,sanitizeName:(name,context)=>context.isAttribute?'attr':'element'};
const builder:XMLBuilder=new Builder(opts);const callable:XMLBuilder=Named({arrayNodeName:'Part'});
const result:string=builder.build({r:'<'});void result;void callable;
// @ts-expect-error numeric finite depth budget
new Builder({maxNestedTags:'10'});
// @ts-expect-error sanitizer must return a name
new Builder({sanitizeName:()=>42});
// @ts-expect-error options cannot be reassigned
builder.options={};

import CommonJS = require('vfast-xml-builder');
const cjsResult:string=new CommonJS().build({r:'x'});const cjsCallable:CommonJS.XMLBuilder=CommonJS();void cjsResult;void cjsCallable;
