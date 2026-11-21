import React from 'react';
import {Stack} from '@buttons';
import {ThemeProvider} from '@integration';
import {createTheme} from '@mui/material/styles';

const responsive = {xs:'column',sm:'row'};
const callerProps = {
  arml: {direction:'row',spacing:1.5,alignItems:'center',flexWrap:'wrap'},
  warml: {direction:responsive,spacing:1.5,flexWrap:'wrap',useFlexGap:true},
  mic: {direction:responsive,spacing:2},
  editor: {direction:'row',spacing:2,sx:{mt:2}},
};
const theme = createTheme({spacing:'0.5rem', components:{MuiStack:{
  defaultProps:{component:'section'}, styleOverrides:{root:{borderTopWidth:3,borderTopStyle:'solid'}},
}}});
export function ContestStack({kind='warml',modern=false, divider=false, styled=false, count=3, ...more}) {
  const props = {...callerProps[kind], ...more};
  // Material 9 consumes alignment through sx. The installed app still passes
  // the Material 7 direct props, and VPM accepts both spellings.
  if (modern) {
    const {alignItems,flexWrap} = props;
    if (alignItems || flexWrap) props.sx = {...props.sx,alignItems,flexWrap};
    delete props.alignItems;
    delete props.flexWrap;
  }
  const content = <Stack id="contest" aria-label="Contest links" {...props} divider={divider ? <hr/> : undefined}>
    {Array.from({length:count},(_,i)=><a key={i} href={'#team-'+i}>Team {i+1}</a>)}
  </Stack>;
  return styled ? <ThemeProvider theme={theme}>{content}</ThemeProvider> : content;
}
export function HydrationScene() { return <ContestStack kind="mic" styled/>; }
