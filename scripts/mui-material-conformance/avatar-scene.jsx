import React from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {createTheme} from '@mui/material/styles';
import {ThemeProvider} from '@integration';
import {Avatar,Chip,Button} from '@buttons';
import AvatarGroup from '@control-group';
export const photo='/avatar.svg';
export function makeTheme({mode='light',variables=false,custom=false,rtl=false}={}){return createTheme({cssVariables:variables,direction:rtl?'rtl':'ltr',palette:{mode},...(custom?{components:{MuiAvatar:{styleOverrides:{root:{width:36,height:36,fontSize:'.8125rem'}}}}}:{})});}
export function VariantScene({mode='light',variables=false,custom=false,rtl=false,tick=0}){
 const theme=React.useMemo(()=>makeTheme({mode,variables,custom,rtl}),[mode,variables,custom,rtl]),cache=React.useMemo(()=>createCache({key:rtl?'avatarrtl':'avatarltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const [src,setSrc]=React.useState(photo),events=React.useRef([]),refs=React.useRef({});
 React.useEffect(()=>{window.avatarControls={setSrc,events,refs};},[]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><div id="avatars" dir={rtl?'rtl':'ltr'} data-tick={tick} style={{padding:20}}>
 <Button id="user-menu" color="inherit"><Avatar id="profile" variant="rounded" src={src} alt="user photo" ref={n=>refs.current.root=n} slotProps={{img:{ref:n=>refs.current.img=n,onLoad:()=>events.current.push('load'),onError:()=>events.current.push('error'),referrerPolicy:'no-referrer'}}} sx={theme=>({background:theme.vars?.palette.background.default||theme.palette.background.default,color:theme.vars?.palette.text.secondary||theme.palette.text.secondary})}/></Button>
 <Chip id="roommate" label="Ada" onDelete={()=>{}} avatar={<Avatar sx={{bgcolor:'#244b70',color:'white'}}>A</Avatar>}/>
 <AvatarGroup id="group" max={3}><Avatar alt="Ada" src={photo}/><Avatar>A</Avatar><Avatar>B</Avatar><Avatar>C</Avatar></AvatarGroup>
 {['circular','rounded','square'].map(variant=><div key={variant}><Avatar id={variant+'-initial'} variant={variant}>A</Avatar><Avatar id={variant+'-icon'} variant={variant}/><Avatar id={variant+'-photo'} variant={variant} alt="Student" src={photo}/></div>)}
 <Avatar id="bad-alt" src="/bad.png" alt="Student"/><Avatar id="bad-child" src="/bad.png">A</Avatar><Avatar id="bad-icon" src="/bad.png"/>
 <Avatar id="responsive" srcSet={photo+' 1x, /large.svg 2x'} sizes="40px" alt="Responsive"/>
 <Avatar id="slots" src={photo} slotProps={{root:{'data-root':'yes'},img:()=>({'data-img':'yes'})}}/>
 <button id="outside">Outside</button>
 </div></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <><Avatar id="hydrated" alt="Student" src={photo}/><Avatar id="hydrated-bad" alt="Missing" src="/bad-hydration.png"/></>}
