import React from 'react';
import {createRoot} from 'react-dom/client';
import {ThemeProvider} from '@mui/material/styles';
import {motion} from '@motion';
import {IconButton} from '@buttons';
import {makeTheme} from './text-scene.jsx';

// The app's shared external-link toolbar renders Material IconButton with a
// motion.button root and inherits variants through an intervening wrapper.
// Keep the example synthetic; the private application source is not bundled.
export async function checkApplicationRoots({modern=true}={}) {
  const host=document.createElement('div');document.body.append(host);
  const root=createRoot(host),ref=React.createRef(),events=[];
  const container={hidden:{opacity:0},show:{opacity:1,transition:{duration:.03,staggerChildren:.02}}};
  const item={hidden:{opacity:0,y:10},show:{opacity:1,y:0,transition:{duration:.03}}};
  function Scene({mode='light',tick=0,disabled=false}) {
    const theme=React.useMemo(()=>makeTheme({variables:true,mode}),[mode]);
    return <ThemeProvider theme={theme}>
      <motion.div variants={container} initial="hidden" animate="show" data-tick={tick}>
        <section><IconButton component={motion.button} ref={ref} variants={item}
          aria-label="Open contest" disabled={disabled} disableRipple onClick={()=>events.push('open')}>↗</IconButton></section>
      </motion.div>
    </ThemeProvider>;
  }
  const wait=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  try {
    root.render(<Scene/>);
    for(let n=0;n<120;n++) {
      await wait();
      if(ref.current && Number(getComputedStyle(ref.current).opacity)===1 && new DOMMatrix(getComputedStyle(ref.current).transform).m42===0)break;
      if(n===119)throw Error('Material motion root failed to reach its inherited variant');
    }
    const button=ref.current;
    if(button.tagName!=='BUTTON'||button.getAttribute('type')!==(modern?'button':null))throw Error('Material motion root lost native button semantics');
    if(button.hasAttribute('variants')||button.hasAttribute('initial'))throw Error('Motion props leaked to DOM');
    button.focus();button.click();
    root.render(<Scene mode="dark" tick={1}/>);await wait();
    if(ref.current!==button||document.activeElement!==button)throw Error('Theme rerender replaced/focused motion button');
    if(events.join()!=='open')throw Error('Motion button lost activation callback');
    root.render(<Scene disabled/>);await wait();
    if(button.disabled!==modern||button.tabIndex!==-1)throw Error('Disabled custom button semantics differ');
    if(button.hasAttribute('nativeButton'))throw Error('nativeButton leaked to DOM');
    root.unmount();
    if(ref.current!==null)throw Error('Motion button retained ref after unmount');
    return {nativeButton:true,variantCompleted:true,stableFocus:true,activation:true,refReleased:true};
  } finally {if(host.firstChild)root.unmount();host.remove();}
}
