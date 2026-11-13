// Motion targets used by VentiMath's notification bell. This tests the DOM
// foundation only: the app's useAnimation React controller is still a gate.
export async function checkNotificationBell(current, appAnimate, vpm) {
  const samples=[];
  const tick=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  for(const api of [current,{animateElement:(node,frames,options)=>[appAnimate(node,frames,options)],releaseElement:()=>{}},vpm]) {
    const node=document.createElement('div');
    node.style.cssText='--mui-palette-secondary-main:rgb(100,50,150);--mui-palette-action-active:rgb(30,40,50);color:var(--mui-palette-action-active)';
    document.body.append(node);
    const controls=[];
    try {
      controls.push(...api.animateElement(node,{
        rotate:[0,20,-20,0],color:['var(--mui-palette-secondary-main)'],
      },{duration:.2,repeat:5,autoplay:false}));
      const row=[];
      for(const time of [.05,.1,.15,.25,.9,1.2]) {
        for(const control of controls)control.time=time;
        await tick();
        const matrix=new DOMMatrix(getComputedStyle(node).transform);
        row.push([matrix.a,matrix.b,matrix.c,matrix.d,getComputedStyle(node).color]);
      }
      // A reset replaces ongoing bell playback, as the app does after its timer.
      for(const control of controls){control.time=.05;control.play();}
      await tick();
      const reset=api.animateElement(node,{rotate:0,scale:1,color:'var(--mui-palette-action-active)'},{duration:0});
      controls.push(...reset);
      await Promise.all(reset.map(control=>control.finished));await tick();
      const transform=new DOMMatrix(getComputedStyle(node).transform);
      if(Math.abs(transform.a-1)>.0001||Math.abs(transform.b)>.0001||getComputedStyle(node).color!=='rgb(30, 40, 50)')throw Error('Notification reset did not restore neutral bell');
      node.style.setProperty('--mui-palette-action-active','rgb(70, 80, 90)');
      if(getComputedStyle(node).color!=='rgb(70, 80, 90)')throw Error('Notification endpoint lost its live theme variable');
      samples.push(row);
      api.releaseElement(node);
      const final=node.getAttribute('style');await tick();
      if(node.getAttribute('style')!==final)throw Error('Released notification animation wrote again');
    } finally {for(const control of controls)control.stop();api.releaseElement(node);node.remove();}
  }
  for(const row of samples.slice(1))for(let i=0;i<row.length;i++)for(let j=0;j<5;j++) {
    if(j===4 ? row[i][j]!==samples[0][i][j] : Math.abs(row[i][j]-samples[0][i][j])>.002)
      throw Error('Notification keyframe/repeat sample differs: '+JSON.stringify(samples));
  }
}
