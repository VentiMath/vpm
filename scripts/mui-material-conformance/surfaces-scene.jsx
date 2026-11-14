import React from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {createTheme} from '@mui/material/styles';
import {ThemeProvider,styled} from '@integration';
import {Paper,Divider,Icon,Box} from '@buttons';
import {motion} from '@motion';
export function makeTheme({mode='light',rtl=false,variables=false,custom=false}={}){
 return createTheme({cssVariables:variables,direction:rtl?'rtl':'ltr',palette:{mode,primary:{main:'#2459a9'},secondary:{main:'#8b336e'}},
 ...(custom?{spacing:6,shape:{borderRadius:7},components:{
 MuiPaper:{defaultProps:{elevation:2},styleOverrides:{root:{backgroundImage:'none'},rounded:{borderRadius:12},outlined:{borderStyle:'dashed'}},variants:[{props:{variant:'contest'},style:{backgroundColor:'#bbccee',padding:8}}]},
 MuiDivider:{styleOverrides:{root:{borderColor:'#56789a'},wrapper:{fontWeight:600},middle:{opacity:.7}}},
 MuiIcon:{defaultProps:{baseClassName:'material-symbols-rounded'},styleOverrides:{fontSizeLarge:{fontSize:31},colorSecondary:{color:'#8b336e'}}}
 }}:{})});
}
export function SurfaceScene({mode='light',rtl=false,variables=false,custom=false,tick=0}){
 const theme=React.useMemo(()=>makeTheme({mode,rtl,variables,custom}),[mode,rtl,variables,custom]);
 const cache=React.useMemo(()=>createCache({key:rtl?'surfrtl':'surfltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const paper=React.useRef(null),icon=React.useRef(null),divider=React.useRef(null);
 React.useEffect(()=>{window.surfaceControls={paper,icon,divider};},[]);
 React.useEffect(()=>()=>cache.sheet.flush(),[cache]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><section id="surfaces" dir={rtl?'rtl':'ltr'} data-tick={tick} style={{fontFamily:'Arial',fontSize:16,padding:20,background:mode==='dark'?'#121212':'#fff'}}>
 <Paper id="paper-default" ref={paper} tabIndex={0} component="article" sx={{p:2,width:{xs:200,sm:300},mb:2}}>Contest</Paper>
 <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8}}>{Array.from({length:25},(_,i)=><Paper id={'paper-'+i} key={i} elevation={i} square={i%2===1} sx={{p:1}}>Elevation {i}</Paper>)}</div>
 <Paper id="paper-outline" variant="outlined" sx={{p:2,mt:2}}>Math is Cool</Paper>
 {custom&&<Paper id="paper-custom" variant="contest">Custom</Paper>}
 <Paper id="paper-inline" elevation={4} style={{'--Paper-shadow':'0 0 2px red','--Paper-overlay':'none',borderRadius:3}}>Inline</Paper>
 <Paper id="paper-motion" component={motion.div} initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0}} sx={{p:2}}>Animated contest</Paper>
 {['fullWidth','inset','middle'].map(variant=><React.Fragment key={variant}>
 <Divider id={'divider-'+variant} variant={variant} ref={variant==='fullWidth'?divider:undefined}/>
 <div style={{display:'flex',height:40}}><span>Left</span><Divider id={'vertical-'+variant} orientation="vertical" flexItem variant={variant}/><span>Right</span></div>
 </React.Fragment>)}
 {['left','center','right'].map(textAlign=><Divider id={'label-'+textAlign} key={textAlign} textAlign={textAlign}>Contests</Divider>)}
 <div style={{height:100}}><Divider id="vertical-label" orientation="vertical">Round</Divider></div>
 <div style={{position:'relative',height:20}}><Divider id="absolute-divider" absolute/></div>
 {['small','medium','large','inherit'].map(fontSize=><React.Fragment key={fontSize}>
 <Icon id={'icon-'+fontSize} fontSize={fontSize} color="secondary">palette</Icon>
 <Icon id={'named-'+fontSize} fontSize={fontSize} role="img" aria-label={fontSize+' palette'} aria-hidden={false}>palette</Icon>
 </React.Fragment>)}
 <Box id="fuse-icon" component={Icon} ref={icon} fontSize="small" color="primary" sx={{width:18,height:18}}>palette</Box>
 </section></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){const cache=React.useMemo(()=>createCache({key:"surfacehydrate"}),[]);React.useEffect(()=>()=>cache.sheet.flush(),[cache]);return <CacheProvider value={cache}><Paper component="article"><Divider>Contest</Divider><Icon aria-hidden={false} role="img" aria-label="Palette">palette</Icon></Paper></CacheProvider>}
