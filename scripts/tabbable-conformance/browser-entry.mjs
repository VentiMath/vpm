import * as upstream from './node_modules/tabbable/dist/index.esm.js';
import * as vpm from '../../packages/vtabbable/runtime.mjs';
import fixtures from './fixtures.cjs';
import {appendHTMLWithShadowRoots} from './upstream/test/shadow-root-utils.js.txt';
const same=(a,b,label)=>{if(a.length!==b.length||a.some((node,i)=>node!==b[i]))throw Error(label+'\nupstream: '+a.map(n=>n.outerHTML?.slice(0,150))+'\nvpm: '+b.map(n=>n.outerHTML?.slice(0,150)));};
const assert=(condition,label)=>{if(!condition)throw Error(label);};
export function run(){
 let comparisons=0, inertDifferences=0;
 for(const [name,html] of Object.entries(fixtures)){
  const host=document.createElement('div');document.body.append(host);appendHTMLWithShadowRoots(host,html);
  for(const displayCheck of ['full','full-native','legacy-full','non-zero-area','none'])for(const getShadowRoot of [undefined,true,node=>node.shadowRoot||node.closedShadowRoot])for(const includeContainer of [false,true])for(const method of ['tabbable','focusable']){
   const options={displayCheck,getShadowRoot,includeContainer};
   const original=upstream[method](host,options);
   // This original fixture includes slotted nodes under inert shadow ancestors.
   // Keep the fault visible and prove each exclusion with native focus behavior.
   const expected=original.filter(node=>{
    if(name!=='shadow-dom-query')return true;
    for(let p=node;p;p=p.assignedSlot||p.parentNode||p.host){if(p.hasAttribute?.('inert')){node.focus();assert(node.getRootNode().activeElement!==node,'native inert fixture focus');inertDifferences++;return false;}}
    return true;
   });
   same(expected,vpm[method](host,options),`${name}/${displayCheck}/${!!getShadowRoot}/${includeContainer}/${method}`);comparisons++;
  }
  host.remove();
 }
 const mount=html=>{const host=document.createElement('div');host.innerHTML=html;document.body.append(host);return host;};
 let host=mount('<form id="radio-form"><input type="radio" name="group" id="inside"></form><input form="radio-form" type="radio" name="group" id="outside" checked>');
 assert(upstream.tabbable(host).length===2,'original external radio fault');same([host.querySelector('#outside')],vpm.tabbable(host),'external radio group');host.remove();
 host=mount('<div inert><div id="shadow-host"></div></div>');let shadow=host.querySelector('#shadow-host').attachShadow({mode:'open'});shadow.innerHTML='<button>Hidden</button>';let button=shadow.firstElementChild;button.focus();assert(shadow.activeElement!==button,'native inert focus rejection');assert(upstream.isFocusable(button)&&!vpm.isFocusable(button),'inert across shadow fault');host.remove();
 host=mount('<fieldset disabled><legend><fieldset disabled><legend><button>Allowed</button></legend></fieldset></legend></fieldset>');button=host.querySelector('button');button.focus();assert(document.activeElement===button,'native nested legend focus');same([],upstream.tabbable(host),'original nested legend fault');same([button],vpm.tabbable(host),'nested legend');host.remove();
 host=mount('<div inert="false"><button>Inert attribute presence</button></div>');button=host.querySelector('button');button.focus();assert(document.activeElement!==button&&!vpm.isFocusable(button),'inert is a boolean attribute');host.remove();
 host=mount('<div id="assigned" inert><button slot="target">Assigned</button></div>');shadow=host.firstElementChild.attachShadow({mode:'open'});shadow.innerHTML='<slot name="target"></slot>';assert(vpm.tabbable(host,{getShadowRoot:true}).length===0,'inert assigned node');host.remove();
 const frame=document.createElement('iframe');document.body.append(frame);frame.contentDocument.body.innerHTML='<button>Other realm</button>';button=frame.contentDocument.querySelector('button');assert(vpm.isTabbable(button),'cross-realm predicate');same([button],vpm.tabbable(frame.contentDocument.body),'cross-realm traversal');frame.remove();
 assert(inertDifferences>0,"inert fixture control exercised");return {comparisons,inertDifferences,regressions:6};
}
