'use strict';
const assert=require('node:assert/strict');
require('./compare-scenes.cjs')('focus-removal',async({send,evaluate,wait,baseUrl})=>{
 const inside="!!(document.querySelector('#inside')?.contains(document.activeElement)||document.querySelector('.MuiDialog-root')?.contains(document.activeElement))";
 const press=async(key,shift=false)=>{const event={key,code:key,modifiers:shift?8:0,windowsVirtualKeyCode:({Tab:9})[key]};await send('Input.dispatchKeyEvent',{type:'keyDown',...event});await send('Input.dispatchKeyEvent',{type:'keyUp',...event});await evaluate('new Promise(r=>setTimeout(r,100))')};
 for(const version of ['app','current'])for(const lib of ['upstream','vpm']){
  const variant=version+'-'+lib;console.log('Checking focus recovery '+variant);
  await send('Page.navigate',{url:baseUrl+variant});await wait("location.pathname==='/"+variant+"'&&window.draw");
  for(const kind of ['dialog','trap']){
   await evaluate(`draw({kind:'${kind}'});document.querySelector('#launch').focus();change('setOpen',true)`);
   await wait("document.querySelector('#inside')?.contains(document.activeElement)||!!document.querySelector('.MuiDialog-root')?.contains(document.activeElement)");
   await evaluate("document.querySelector('#removed').focus();change('setVisible',false)");
   await wait("document.activeElement!==document.body&&(document.querySelector('#inside')?.contains(document.activeElement)||document.querySelector('.MuiDialog-root')?.contains(document.activeElement))");
   await evaluate("change('setOpen',false)");await wait("document.activeElement.id==='launch'");
   // Closing disconnects recovery; unrelated DOM changes must not recapture focus.
   await evaluate("document.querySelector('#launch').blur();document.body.appendChild(document.createElement('i')).remove();new Promise(r=>setTimeout(r,100))");
   assert.equal(await evaluate('document.activeElement===document.body'),true,variant+' closed '+kind);
   await evaluate(`draw({kind:'${kind}',disableEnforceFocus:true});document.querySelector('#launch').focus();change('setOpen',true)`);
   await wait("document.querySelector('#removed')");
   await evaluate("document.querySelector('#removed').focus();change('setVisible',false);new Promise(r=>setTimeout(r,100))");
   assert.equal(await evaluate('document.activeElement===document.body'),true,variant+' opted out '+kind);
   await evaluate(`draw({kind:'${kind}',disableAutoFocus:true});document.querySelector('#launch').focus();change('setOpen',true);change('setVisible',false);new Promise(r=>setTimeout(r,100))`);
   assert.equal(await evaluate('document.activeElement.id'),'launch',variant+' no autofocus '+kind);
   // The panel's first control is hidden in place, so it cannot take focus back
   // and Shift+Tab starts from the page behind. Focus must return to the panel.
   await evaluate(`draw({kind:'${kind}'});document.querySelector('#launch').focus();change('setOpen',true)`);await wait("document.querySelector('#victim')");
   await evaluate("document.querySelector('#victim').focus();document.querySelector('#victim').hidden=true;new Promise(r=>setTimeout(r,100))");
   await press('Tab',true);
   assert.equal(await evaluate(inside),true,variant+' hidden control '+kind);
   await evaluate("change('setOpen',false)");await wait("document.activeElement.id==='launch'");
  }
  await evaluate("draw({kind:'dialog'});document.querySelector('#launch').focus();change('setOpen',true)");await wait("document.querySelector('#removed')");
  await evaluate("document.querySelector('#nest').focus();change('setNested',true)");await wait("document.querySelector('#inner-removed')");
  await evaluate("document.querySelector('#inner-removed').focus();change('setVisible',false);new Promise(r=>setTimeout(r,100))");
  assert.equal(await evaluate('document.activeElement.id'),'inner-removed',variant+' parent does not steal child focus');
  await evaluate("change('setInner',false)");await wait("document.querySelector('#nested')?.closest('.MuiDialog-root').contains(document.activeElement)");
  await evaluate("change('setNested',false)");await wait("document.activeElement.id==='nest'");
  await evaluate("change('setOpen',false)");await wait("document.activeElement.id==='launch'");
  await evaluate("mountFrame();frameView.document.querySelector('#launch').focus();frameView.control.setOpen(true)");await wait("frameView.document.querySelector('#removed')");
  await evaluate("frameView.document.querySelector('#removed').focus();frameView.control.setVisible(false)");
  await wait("frameView.document.querySelector('.MuiDialog-root')?.contains(frameView.document.activeElement)");
  assert.equal(await evaluate('document.activeElement.id'),'frame',variant+' iframe ownership');
  await evaluate('removeFrame()');
 }
 console.log('Dialog and TrapFocus recover removed controls, keep the next key inside after a control is hidden, respect disabled/closed states, preserve nested ownership and handle iframe documents against Material 7/9.');
}).catch(e=>{console.error(e);process.exitCode=1});
