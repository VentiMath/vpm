import React from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {createTheme} from '@mui/material/styles';
import {ThemeProvider} from '@integration';
import {Container} from '@buttons';
export function makeTheme({custom=false,unit=false,rtl=false}={}) {
 return createTheme({direction:rtl?'rtl':'ltr',cssVariables:custom,
 ...(unit?{breakpoints:{unit:'em',values:{xs:0,sm:37.5,md:56.25,lg:75,xl:96,desktop:100}}}:custom?{spacing:10,breakpoints:{values:{xs:480,sm:640,md:960,lg:1280,xl:1600,desktop:1720}},components:{MuiContainer:{defaultProps:{maxWidth:'md'},styleOverrides:{root:{border:'1px solid currentColor'},fixed:{paddingTop:3},maxWidthSm:{paddingBottom:5},disableGutters:{paddingLeft:2}},variants:[{props:{maxWidth:'md'},style:{borderRadius:4}}]}}}:{})});
}
// Actual page shapes: WARML practice, contestant results, and signup pages.
export function LayoutScene({kind='warml'}) {
 return <Container maxWidth={kind==='warml'?'sm':'lg'} sx={kind==='warml'?{py:4,px:2}:kind==='results'?{py:4}:{py:{xs:3,sm:5},pb:10}}><h1>Contest</h1><p>Problem and signup content</p></Container>;
}
const CustomRoot=React.forwardRef(function CustomRoot(props,ref){return <main {...props} ref={ref}/>});
export function VariantScene({custom=false,unit=false,rtl=false,tick=0}) {
 const theme=React.useMemo(()=>makeTheme({custom,unit,rtl}),[custom,unit,rtl]);
 const cache=React.useMemo(()=>createCache({key:rtl?'containerrtl':'containerltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const [cap,setCap]=React.useState('sm'),ref=React.useRef(null);
 React.useEffect(()=>{window.containerControls={setCap,ref}},[]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><div id="containers" data-tick={tick} dir={rtl?'rtl':'ltr'}>
 <Container id="default">Default</Container>
 {[false,'xs','sm','md','lg','xl',...(custom||unit?['desktop']:[])].flatMap((maxWidth,i)=>[false,true].map(fixed=><Container id={`cap-${i}-${fixed}`} key={`${i}-${fixed}`} maxWidth={maxWidth} fixed={fixed}>Width</Container>))}
 <Container id="gutters" disableGutters maxWidth="sm"/>
 <Container id="custom-root" component={CustomRoot} ref={ref} maxWidth={cap} sx={{py:4,px:{xs:2,sm:3}}}><button id="focus">Stay focused</button></Container>
 <Container id="style" maxWidth="md" sx={{py:2,mx:1}} style={{paddingRight:7}}/>
 <section style={{width:'70%',margin:'auto'}}><Container id="nested" maxWidth="sm"/></section>
 <LayoutScene kind="warml"/><LayoutScene kind="results"/><LayoutScene kind="signup"/>
 </div></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <Container id="hydrated" maxWidth="lg" sx={{py:4}}>Results</Container>}
