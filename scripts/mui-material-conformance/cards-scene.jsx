import React from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {createTheme} from '@mui/material/styles';
import {ThemeProvider} from '@integration';
import {Card,CardContent} from '@buttons';
import CardActionArea from '@card-action';
export function makeTheme({mode='light',variables=false,custom=false,rtl=false}={}){
 return createTheme({direction:rtl?'rtl':'ltr',palette:{mode},cssVariables:variables,...(custom?{spacing:10,components:{
  MuiPaper:{defaultProps:{elevation:3},styleOverrides:{root:{backgroundImage:'none'},rounded:{borderRadius:12}}},
  MuiCard:{styleOverrides:{root:({ownerState})=>({borderRadius:12,...(ownerState.raised?{outline:'1px solid currentColor'}:{})})},variants:[{props:{variant:'outlined'},style:{borderWidth:2}}]},
  MuiCardContent:{defaultProps:{component:'section'},styleOverrides:{root:{paddingTop:18}}},
 }}:{})});
}
// Prop patterns from Mustang exam panels, WARML signup, and practice EmphasisCard.
export function PanelScene({kind='exam'}){
 if(kind==='exam')return <Card variant="outlined" sx={{mb:2}}><CardContent><h2>Mustang Math</h2><p>Exam and problem count</p><button>Open exam</button></CardContent></Card>;
 if(kind==='signup')return <Card sx={{p:3,mb:3,border:'0.125rem solid',borderColor:'primary.main'}}><h2>WARML practice</h2><p>Schedule and signup</p></Card>;
 return <Card elevation={0} sx={{p:2.5,border:'2px solid',borderColor:'var(--vm-success-dark)',bgcolor:'var(--vm-success-tint)',borderRadius:1.5,boxShadow:'0 0.0625rem 0.1875rem rgba(0,0,0,0.06)',transition:'border-color 200ms ease, background-color 200ms ease'}}><p>Answer held up</p></Card>;
}
const CustomRoot=React.forwardRef(function CustomRoot(props,ref){return <article {...props} ref={ref}/>});
export function VariantScene({mode='light',variables=false,custom=false,rtl=false,tick=0}){
 const theme=React.useMemo(()=>makeTheme({mode,variables,custom,rtl}),[mode,variables,custom,rtl]);
 const cache=React.useMemo(()=>createCache({key:rtl?'cardsrtl':'cardsltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const [footer,setFooter]=React.useState(false),[raised,setRaised]=React.useState(false),[clicks,setClicks]=React.useState(0),ref=React.useRef(null),contentRef=React.useRef(null);
 React.useEffect(()=>{window.cardsControls={setFooter,setRaised,ref,contentRef}},[]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><div id="cards" data-tick={tick} dir={rtl?'rtl':'ltr'} style={{'--vm-success-dark':'#136933','--vm-success-tint':'#ddffee'}}>
 <Card id="default"><CardContent id="content">Default</CardContent></Card>
 {[0,1,8,24].flatMap(elevation=>['elevation','outlined'].map(variant=><Card key={elevation+variant} id={`surface-${elevation}-${variant}`} elevation={elevation} variant={variant} square={elevation===24}><CardContent>Surface</CardContent></Card>))}
 <Card id="raised" raised><CardContent>Raised</CardContent></Card>
 <Card id="custom-root" component={CustomRoot} ref={ref} raised={raised} sx={{my:1,p:{xs:1,sm:2}}}>
  <CardContent id="changing-content" ref={contentRef} component="section"><button id="focus">Stay focused</button></CardContent>
  {footer&&<footer>Footer</footer>}
 </Card>
 <Card id="overrides" style={{overflow:'visible','--Paper-shadow':'none'}} sx={{borderRadius:2}}><CardContent id="tight" sx={{p:0,'&:last-child':{pb:0}}}>Tight</CardContent></Card>
 <Card id="article"><CardActionArea id="article-action" disableRipple onClick={()=>setClicks(n=>n+1)}><CardContent>Read article</CardContent></CardActionArea></Card><output id="clicks">{clicks}</output>
 <PanelScene kind="exam"/><PanelScene kind="signup"/><PanelScene kind="practice"/>
 </div></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <Card id="hydrated"><CardContent>Results</CardContent></Card>}
