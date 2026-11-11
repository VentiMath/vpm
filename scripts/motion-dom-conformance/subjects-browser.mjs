export async function checkSubjects(current, app, vpm, currentAnimate, appAnimate) {
  for (const [api, animate] of [[current,currentAnimate],[app,appAnimate],[vpm,vpm.animate]]) {
    const node=document.createElement('div');document.body.append(node);
    let writes=0;
    const a=api.animateSingleValue('#000','#fff',{duration:.05,ease:'linear',onUpdate:x=>{node.style.color=x;writes++;}});
    await a.finished;
    if(getComputedStyle(node).color!=='rgb(255, 255, 255)'||writes<2)throw Error('string single-value rendering');
    const subject={_x:0,get x(){return this._x},set x(value){this._x=value;node.style.transform=`translateX(${value}px)`;}};
    const g=animate(subject,{x:30},{duration:.06,ease:'linear'});
    await g.finished;await new Promise(requestAnimationFrame);
    if(subject.x!==30||getComputedStyle(node).transform!=='matrix(1, 0, 0, 1, 30, 0)')throw Error('object setter renderer');
    g.stop();api.propEffect.state?.(subject)?.release();node.remove();
  }
  const frame=document.createElement('iframe');document.body.append(frame);
  const node=frame.contentDocument.createElement('div');frame.contentDocument.body.append(node);
  const g=vpm.animate(node,{opacity:[0,1]},{duration:.04,ease:'linear'});await g.finished;vpm.styleEffect.flush(node);
  if(frame.contentWindow.getComputedStyle(node).opacity!=='1')throw Error('object fallback intercepted iframe element');
  g.stop();vpm.releaseElement(node);frame.remove();
}
