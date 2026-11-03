import {parse,parseMath,renderMath,createRenderer} from '../index';
import {renderPng} from '../png';
const renderer=createRenderer();const svg:string=renderMath('x').svg;parseMath('x');
parse('Find $x$.').nodes.forEach(node=>{if(node.kind==='math'){const x:string=node.tex;}});
renderer.renderMath('x',{display:true,fontSize:24});renderer.renderText('Hello $x$');renderPng(renderer,'x',{scale:2});
// @ts-expect-error Engine selection is not an API
createRenderer({engine:'katex'});
// @ts-expect-error Display mode must be boolean
renderer.renderMath('x',{display:'block'});
