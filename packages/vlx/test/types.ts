import {parse,parseMath,renderMath,createRenderer} from '../index';
import {renderDocument} from '../index';
const document=renderDocument('text',{numbering:'ams',idPrefix:'lesson',startNumber:1});
const nextNumber:number=document.nextNumber;
const target:string|undefined=document.references[0]?.id;
// @ts-expect-error Numbering policies are explicit
renderDocument('text',{numbering:'auto'});
import {renderPng} from '../png';
const renderer=createRenderer();const svg:string=renderMath('x').svg;parseMath('x');
parse('Find $x$.').nodes.forEach(node=>{if(node.kind==='math'){const x:string=node.tex;}});
renderer.renderMath('x',{display:true,fontSize:24});renderer.renderText('Hello $x$');renderPng(renderer,'x',{scale:2});
// @ts-expect-error Engine selection is not an API
createRenderer({engine:'katex'});
// @ts-expect-error Display mode must be boolean
renderer.renderMath('x',{display:'block'});

import {renderProblemPng,renderProblemSvg,pngSize} from '../problem';
const png:Uint8Array=renderProblemPng({statement:'Find $x$.',options:{A:'1'}});
const page:string=renderProblemSvg({statement:'',figure:{png,width:10}}).svg;pngSize(png);
// @ts-expect-error figures need a display width
renderProblemSvg({statement:'',figure:{png}});
