import React from './node_modules/react';
import {createRoot} from './node_modules/react-dom/client';
import {flushSync} from './node_modules/react-dom';
import {SnackbarProvider} from './node_modules/notistack';
import * as styles from 'goober';
window.gooberVariant = __FIXTURE_VARIANT__;
const pause = () => new Promise(r=>setTimeout(r,40));
const properties = ['display','position','color','backgroundColor','padding','marginLeft','marginRight','fontSize','lineHeight','letterSpacing','borderRadius','boxShadow','alignItems','flexDirection','minWidth','maxWidth','width','left','right','top','bottom','pointerEvents','zIndex'];
const sample = node => Object.fromEntries(properties.map(p=>[p,getComputedStyle(node)[p]]));
window.runGoober = async () => {
 document.body.style.margin='0';
 const rows=[];
 for(const dense of [false,true]) for(const vertical of ['top','bottom']) for(const horizontal of ['left','center','right']) {
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host),ref=React.createRef();
  flushSync(()=>root.render(React.createElement(SnackbarProvider,{ref,maxSnack:5,dense,anchorOrigin:{vertical,horizontal},transitionDuration:0,autoHideDuration:null})));
  flushSync(()=>{ for(const variant of ['default','success','error','warning','info'])ref.current.enqueueSnackbar('VentiMath '+variant,{variant,persist:true}); });
  await pause();
  const container=host.querySelector('.notistack-SnackbarContainer');if(!container)throw Error('No snackbar container');
  const content=Array.from(host.querySelectorAll('[role="alert"]'));if(content.length!==5)throw Error('Missing variants: '+content.length);
  rows.push({dense,vertical,horizontal,container:sample(container),content:content.map(sample),texts:content.map(n=>n.textContent)});
  flushSync(()=>root.unmount());host.remove();
 }
 return rows;
};
window.checkOwnedStyles = () => {
 const iframe=document.createElement('iframe');document.body.append(iframe);iframe.contentWindow.__nonce__='frame-nonce';
 const doc=iframe.contentDocument, scoped=styles.css.bind({target:doc.head});
 const name=scoped({color:'rgb(20, 30, 40)'}),el=doc.createElement('div');el.className=name;doc.body.append(el);
 if(iframe.contentWindow.getComputedStyle(el).color!=='rgb(20, 30, 40)')throw Error('iframe style owner');
 if(doc.head.querySelector('style').nonce!=='frame-nonce')throw Error('owner-document nonce');
 doc.head.querySelector('style').remove();scoped({color:'rgb(20, 30, 40)'});
 if(iframe.contentWindow.getComputedStyle(el).color!=='rgb(20, 30, 40)')throw Error('removed sheet recovery');
 const first=styles.extractCss(doc.head);if(!first.includes(name)||styles.extractCss(doc.head)!=='')throw Error('extraction');
 const hydration=doc.createElement('style');hydration.id='_vgoober';hydration.textContent=first;doc.head.replaceChildren(hydration);scoped({color:'rgb(20, 30, 40)'});
 if(hydration.textContent!==first)throw Error('hydration duplicated');
 const host=doc.createElement('div');doc.body.append(host);const shadow=host.attachShadow({mode:'open'}),local=styles.css.bind({target:shadow});
 const x=doc.createElement('span');x.className=local({color:'rgb(50, 60, 70)'});shadow.append(x);
 if(iframe.contentWindow.getComputedStyle(x).color!=='rgb(50, 60, 70)')throw Error('shadow styles');
 iframe.remove();return true;
};
