import {EntityDecoder,EntityEncoder,XML,ALL_ENTITIES,ENTITY_ACTION,type EntityMap} from 'vnodable-entities';
const map:EntityMap={line:{regx:/x/,val:'\n'}};
const d=new EntityDecoder({namedEntities:map,numericAllowed:XML,limit:{maxTotalExpansions:Infinity,applyLimitsTo:['base','external']},onInputEntity:()=>ENTITY_ACTION.ALLOW});
const decoded:string=d.decode('&amp;');const original:null=d.decode(null);d.setExternalEntities(null);d.addInputEntities(map);d.reset().setXmlVersion(1.1);
const e=new EntityEncoder({namedEntities:ALL_ENTITIES});const encoded:string=e.encode(decoded);const count:number=e.replacementsCount;const number:42=e.encode(42 as const);
void original;void encoded;void count;void number;
// @ts-expect-error named entity encoding requires an explicit table
new EntityEncoder({encodeAllNamed:true});
// @ts-expect-error readonly table
XML.amp='changed';
// @ts-expect-error readonly quota
 e.replacementsCount=0;
// @ts-expect-error hooks return defined decisions
new EntityDecoder({onExternalEntity:()=>true});
// @ts-expect-error postCheck must return a string
new EntityDecoder({postCheck:()=>42});
