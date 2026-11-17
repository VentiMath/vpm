import React from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {createTheme} from '@mui/material/styles';
import {ThemeProvider} from '@integration';
import {Card,CardContent,CardActionArea} from '@buttons';
export function makeTheme({mode='light',variables=false,custom=false,rtl=false}={}){return createTheme({palette:{mode},cssVariables:variables,direction:rtl?'rtl':'ltr',components:{MuiButtonBase:{defaultProps:{disableRipple:true}},...(custom?{MuiCardActionArea:{styleOverrides:{root:{borderRadius:8},focusHighlight:{backgroundColor:'rgb(20, 30, 40)'}}}}:{})}})}
// Matches the app Link/FuseLink forwarding contract; navigation is prevented in the fixture.
const RouterLink=React.forwardRef(function RouterLink({to,href,...props},ref){return <a {...props} href={to||href} ref={ref}/>});
export function PanelScene({kind='article'}){return <Card variant="outlined"><CardActionArea component={RouterLink} to={kind==='article'?'/club/test/articles/algebra':'/apps/contests/mathiscool/test'} sx={kind==='article'?{height:'100%',display:'flex',flexDirection:'column',alignItems:'stretch'}:{p:2,height:'100%',alignItems:'flex-start'}}><CardContent sx={{flex:1,display:'flex',flexDirection:'column'}}>Contest article</CardContent></CardActionArea></Card>}
export function VariantScene({mode='light',variables=false,custom=false,rtl=false,tick=0}){
 const theme=React.useMemo(()=>makeTheme({mode,variables,custom,rtl}),[mode,variables,custom,rtl]),cache=React.useMemo(()=>createCache({key:rtl?'actionrtl':'actionltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const [clicks,setClicks]=React.useState(0),[disabled,setDisabled]=React.useState(false),ref=React.useRef(null),action=React.useRef(null);
 React.useEffect(()=>{window.actionControls={ref,action,setDisabled}},[]);
 const click=e=>{e.preventDefault();setClicks(n=>n+1)};
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><div id="actions" data-tick={tick} dir={rtl?'rtl':'ltr'} style={{width:'80%',margin:'auto'}}>
 <button id="outside">Outside</button>
 <Card><CardActionArea id="button" ref={ref} action={action} disabled={disabled} onClick={click} focusVisibleClassName="app-focus"><CardContent>Open exam</CardContent></CardActionArea></Card>
 <CardActionArea id="router" component={RouterLink} to="/exam" onClick={click} sx={{p:2}}>Open link</CardActionArea>
 <CardActionArea id="disabled" href="/disabled" disabled onClick={click}>Disabled</CardActionArea>
 <CardActionArea id="slot-props" slotProps={{focusHighlight:{'data-highlight':'custom'}}}>Slot props</CardActionArea>
 <PanelScene kind="article"/><PanelScene kind="exam"/><output id="clicks">{clicks}</output>
 </div></ThemeProvider></CacheProvider>
}
export function HydrationScene(){return <CardActionArea id="hydrated" disableRipple>Exam</CardActionArea>}
