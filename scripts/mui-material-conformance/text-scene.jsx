import React from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import {ThemeProvider,createTheme} from '@mui/material/styles';
import {Typography,Link,SvgIcon,createSvgIcon} from '@buttons';
import ArrowBack from '@icons/ArrowBack';
import OpenInNew from '@icons/OpenInNew';
import Print from '@icons/Print';
const Router=React.forwardRef(({to,...props},ref)=><a {...props} href={to} ref={ref}/>);
const Outline=React.forwardRef((props,ref)=><svg viewBox="0 0 40 20" {...props} ref={ref}/>);
const CustomIcon=createSvgIcon(<path d="M2 2h20v20H2z"/>,'Contest');
export function makeTheme({mode='light',rtl=false,variables=false}={}){return createTheme({
 cssVariables:variables,direction:rtl?'rtl':'ltr',palette:{mode,primary:{main:'#2459a9'},secondary:{main:'#8b336e'}},
 typography:{fontFamily:'Arial, sans-serif',h3:{fontSize:'2rem'},contest:{fontSize:'1.1rem',fontWeight:600,lineHeight:1.6}},
 components:{
  MuiTypography:{defaultProps:{variantMapping:{body2:'div'}},styleOverrides:{root:{maxWidth:'100%'},h6:{letterSpacing:'.03em'}},variants:[{props:{variant:'contest'},style:{borderLeft:'3px solid #2459a9',paddingLeft:8}}]},
  MuiLink:{styleOverrides:{root:{textUnderlineOffset:'3px'},underlineHover:{textDecorationThickness:'2px'}}},
  MuiSvgIcon:{styleOverrides:{fontSizeSmall:{fontSize:12},fontSizeMedium:{fontSize:16},fontSizeLarge:{fontSize:24}}},
 }
});}
export function TextScene({mode='light',rtl=false,variables=false,tick=0}){
 const theme=React.useMemo(()=>makeTheme({mode,rtl,variables}),[mode,rtl,variables]);
 const cache=React.useMemo(()=>createCache({key:rtl?'textrtl':'textltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 React.useEffect(()=>()=>cache.sheet.flush(),[cache]);
 const linkRef=React.useRef(),iconRef=React.useRef(),events=React.useRef([]);
 React.useEffect(()=>{window.textControls={linkRef,iconRef,events}},[]);
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><section id="text-scene" dir={rtl?'rtl':'ltr'} data-tick={tick} style={{padding:20,color:mode==='dark'?'#eee':'#171717',background:mode==='dark'?'#171717':'#fff',fontFamily:'Arial',fontSize:16}}>
  {['h1','h2','h3','h4','h5','h6','subtitle1','subtitle2','body1','body2','caption','button','overline','inherit','contest'].map(variant=><Typography key={variant} id={'text-'+variant} variant={variant} gutterBottom>{variant}: Contest resources</Typography>)}
  <Typography id="nowrap" noWrap sx={{width:120,color:'text.secondary'}}>A long contest title that truncates correctly</Typography>
  <Typography id="aligned" align="right" variant="body2" color="secondary" sx={{fontSize:{xs:12,sm:18},mt:2}}>Aligned text</Typography>
  <div style={{display:'flex',gap:12}}>
   {['always','hover','none'].map(underline=><Link id={'link-'+underline} key={underline} href="#local" underline={underline} onClick={e=>{e.preventDefault();events.current.push(underline)}}>{underline} link</Link>)}
   <Link id="router" ref={linkRef} component={Router} to="/contests/amc" color="secondary" onClick={e=>{e.preventDefault();events.current.push('router')}}>AMC</Link>
   <Link id="link-button" component="button" type="button" onClick={()=>events.current.push('button')}>Show contest</Link>
  </div>
  <div style={{display:'flex',gap:12,alignItems:'center'}}>
   {['small','medium','large','inherit'].map(fontSize=><SvgIcon id={'icon-'+fontSize} key={fontSize} fontSize={fontSize} color="primary" titleAccess={fontSize+' contest'}><path d="M2 2h20v20H2z"/></SvgIcon>)}
   <SvgIcon id="decorative" color="action"><circle cx="12" cy="12" r="8"/></SvgIcon>
   <SvgIcon id="outline" ref={iconRef} component={Outline} inheritViewBox htmlColor="#8b336e" titleAccess="Outline"><path d="M1 1h38v18H1z" fill="none" stroke="currentColor"/></SvgIcon>
   <CustomIcon id="custom-icon" titleAccess="Custom contest" color="secondary"/>
   <ArrowBack id="upstream-back" titleAccess="Back"/><OpenInNew id="upstream-open" color="secondary"/><Print id="upstream-print" fontSize="large"/>
  </div>
 </section></ThemeProvider></CacheProvider>;
}
