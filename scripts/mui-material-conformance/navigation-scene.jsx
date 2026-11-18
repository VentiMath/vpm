import React from 'react';
import {createTheme} from '@mui/material/styles';
import {CacheProvider} from '@emotion/react';import createCache from '@emotion/cache';import rtlPlugin from 'stylis-plugin-rtl';
import {ThemeProvider} from '@integration';
import {TableSortLabel,Pagination,PaginationItem,Table,TableHead,TableBody,TableRow,TableCell} from '@buttons';
import {useMaterialReactTable,MRT_TablePagination} from '@table-caller';
export function makeTheme({mode='light',variables=false,rtl=false,custom=false}={}){return createTheme({direction:rtl?'rtl':'ltr',palette:{mode},cssVariables:variables,...(custom?{components:{MuiTableSortLabel:{styleOverrides:{root:{letterSpacing:'1px'},icon:{marginLeft:6}}},MuiPagination:{styleOverrides:{ul:{columnGap:2}}},MuiPaginationItem:{styleOverrides:{root:{fontWeight:600},rounded:{borderRadius:7},sizeSmall:{minWidth:28}}}}}:{})});}
const rows=Array.from({length:44},(_,i)=>({id:i+1,name:'Resource '+String(i+1).padStart(2,'0')}));
export function NavigationScene({mode='light',variables=false,rtl=false,custom=false,size='small',shape='rounded',variant='outlined',color='secondary',disabled=false,count=12,tick=0,controlled=false}={}){
 const theme=React.useMemo(()=>makeTheme({mode,variables,rtl,custom}),[mode,variables,rtl,custom]),cache=React.useMemo(()=>createCache({key:rtl?'navrtl':'navltr',stylisPlugins:rtl?[rtlPlugin]:[]}),[rtl]);
 const [page,setPage]=React.useState(5),[direction,setDirection]=React.useState('asc'),ref=React.useRef(),sortRef=React.useRef();
 const table=useMaterialReactTable({columns:[{accessorKey:'name',header:'Resource'}],data:rows,initialState:{pagination:{pageSize:15,pageIndex:0}},getRowId:row=>String(row.id),muiPaginationProps:{color:'secondary',shape:'rounded',variant:'outlined',showRowsPerPage:false},enableRowSelection:true,enableGrouping:true});
 React.useEffect(()=>{window.navigationControls={ref,sortRef,table,setPage,setDirection}},[table]);
 const record=(event,n)=>{window.pageEvents=(window.pageEvents||[]).concat(n);if(controlled)setPage(n)};
 return <CacheProvider value={cache}><ThemeProvider theme={theme}><section id="navigation" dir={rtl?'rtl':'ltr'} data-tick={tick}>
 <Table><TableHead><TableRow><TableCell id="sort-cell" sortDirection={direction}><TableSortLabel id="sort-label" ref={sortRef} active direction={direction} disabled={disabled} onClick={()=>setDirection(v=>v==='asc'?'desc':'asc')}>Resource</TableSortLabel></TableCell></TableRow></TableHead><TableBody><TableRow><TableCell>Example</TableCell></TableRow></TableBody></Table>
 <Pagination id="pages" ref={ref} count={count} defaultPage={5} page={controlled?page:undefined} onChange={record} disabled={disabled} size={size} variant={variant} shape={shape} color={color} showFirstButton showLastButton/>
 <PaginationItem id="selected" page={3} selected disabled={disabled} size={size} variant={variant} shape={shape} color={color}/>
 <PaginationItem id="disabled-selected" page={4} selected disabled size={size} variant={variant} shape={shape} color={color}/>
 <div id="ellipsis"><PaginationItem type="start-ellipsis" disabled={disabled} size={size} variant={variant} shape={shape} color={color}/></div>
 <Pagination id="translated" count={4} getItemAriaLabel={(type,n,selected)=>type==='page'?`${selected?'Page actuelle':'Aller à la page'} ${n}`:`Navigation ${type}`}/>
 <Pagination id="linked" count={4} renderItem={item=><PaginationItem {...item} component="a" href={'#page-'+item.page}/>}/>
 <div id="table-caller"><MRT_TablePagination table={table}/><output id="table-page">{table.getState().pagination.pageIndex}</output><output id="table-first">{table.getRowModel().rows[0]?.original.name}</output></div>
 </section></ThemeProvider></CacheProvider>;
}
export function HydrationScene(){return <NavigationScene/>;}
