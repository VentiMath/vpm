import React from 'react';
import {motion,useAnimation,MotionConfig} from '@motion';
import {IconButton,Box,ThemeProvider} from 'vmui-material';
import {createTheme} from '@mui/material/styles';
const theme=createTheme({components:{MuiButtonBase:{defaultProps:{disableRipple:true}}}});
export function Scenario({kind='fade',tick=0,count=3,visible=true,label='show',reducedMotion='never',color='red'}) {
 const controls=useAnimation(),events=React.useRef([]),ref=React.useRef(null);
 React.useLayoutEffect(()=>{window.motionTest={controls,events,ref};},[controls]);
 const container={hidden:{opacity:0},show:{opacity:1,transition:{duration:.04,staggerChildren:.035}}};
 const item={hidden:{opacity:0,y:12},show:{opacity:1,y:0,transition:{duration:.04}}};
 const common={id:'subject',ref,'data-tick':tick,onAnimationStart:()=>events.current.push('start'),onAnimationComplete:()=>events.current.push('complete')};
 let child;
 if(kind==='style')child=<motion.div {...common} style={{color}} initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.04}}>Style</motion.div>;
 if(kind==='nested')child=<motion.div initial="hidden" animate="show" variants={container}><motion.div animate={{opacity:1}}><motion.div id="nested" initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.04}}>Independent</motion.div></motion.div><motion.div inherit={false} initial="hidden" animate="show" variants={container}><motion.div id="nested-child" variants={item}>Nested scope</motion.div></motion.div></motion.div>;
 if(kind==='long')child=<motion.div {...common} initial={{x:-200}} animate={{x:0}} transition={{duration:3}}>Reduced</motion.div>;
 if(kind==='fade')child=visible?<motion.div {...common} initial={{opacity:0}} animate={{opacity:1}} transition={{duration:.09}}>Contest</motion.div>:null;
 if(kind==='slide')child=<motion.span {...common} initial={{x:-20}} animate={{x:0,transition:{delay:.03,duration:.08}}}>Directory</motion.span>;
 if(kind==='scale')child=<motion.div {...common} initial={{scale:0}} animate={{scale:1,transition:{delay:.03,duration:.08}}}>Calendar</motion.div>;
 if(kind==='variants')child=<motion.div id="container" initial="hidden" animate={label} variants={container}>
  {Array.from({length:count},(_,i)=><section key={i}><motion.button id={'item-'+i} variants={item} onAnimationStart={()=>events.current.push('start-'+i)} onAnimationComplete={()=>events.current.push('end-'+i)}>Contest {i}</motion.button></section>)}
 </motion.div>;
 if(kind==='initial-false')child=<motion.div {...common} initial={false} animate={{opacity:1,y:0}}>Ready</motion.div>;
 if(kind==='bell')child=<motion.div {...common} animate={controls} style={{color:'var(--mui-palette-action-active)'}}>Bell</motion.div>;
 if(kind==='material')child=<ThemeProvider theme={theme}><Box component={motion.div} initial="hidden" animate="show" variants={container}>
  <IconButton component={motion.button} {...common} variants={item} aria-label="Open contest">↗</IconButton>
 </Box></ThemeProvider>;
 return <MotionConfig reducedMotion={reducedMotion}><div style={{'--mui-palette-action-active':'rgb(30,40,50)','--mui-palette-secondary-main':'rgb(100,50,150)'}}>{child}</div></MotionConfig>;
}
export function SSRScene({kind='fade',count=12}){
 if(kind==='variants')return <motion.div initial="hidden" animate="show" variants={{hidden:{opacity:0},show:{opacity:1,transition:{staggerChildren:.04}}}}>
 {Array.from({length:count},(_,i)=><section key={i}><motion.div variants={{hidden:{y:20,opacity:0},show:{y:0,opacity:1}}}>Contest {i}</motion.div></section>)}</motion.div>;
 return <>{Array.from({length:count},(_,i)=><motion.div key={i} initial={kind==='initial-false'?false:{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:.2}}>Contest {i}</motion.div>)}</>;
}
