import {XMLParser,XMLBuilder,XMLValidator,type X2jOptions,type XMLMetaData,type XmlBuilderOptions} from 'vfast-xml-parser';
import {Expression} from 'vpath-expression-matcher';
import {EntityDecoder} from 'vnodable-entities';
const options:X2jOptions={stopNodes:[new Expression('..raw')],entityDecoder:new EntityDecoder(),htmlEntities:{copy:'©'},numberParseOptions:{hex:true},processEntities:{appliesTo:['external'],allowedTags:(tag,path)=>typeof path==='string'&&tag==='a'}};
const parser=new XMLParser(options);parser.addEntity('custom','value');parser.parse(new Uint8Array([60,114,47,62]),true);
const metadata:XMLMetaData={startIndex:0};const symbol:symbol=XMLParser.getMetaDataSymbol();void metadata;void symbol;
const builderOptions:XmlBuilderOptions={arrayNodeName:'Part'};const builder:XMLBuilder=new XMLBuilder(builderOptions);const xml:string=builder.build({r:'a'});
const result=XMLValidator.validate(xml);if(result!==true){const msg:string=result.err.msg;void msg;}
// @ts-expect-error no arbitrary object coercion
parser.parse({toString(){return '<r/>';}});
// @ts-expect-error callbacks must return names
new XMLParser({transformTagName:()=>123});
// @ts-expect-error options snapshot cannot be reassigned
parser.options={};
// @ts-expect-error validator is not a constructor
new XMLValidator();
