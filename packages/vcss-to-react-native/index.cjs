'use strict';
const parse=require('vpostcss-value-parser'),camelize=require('vcamelize'),colors=require('vcss-color-keywords');
const numeric=/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
const lengthUnit=/^(?:px|em|rem|ex|ch|vh|vw|vmin|vmax|cm|mm|in|pc|pt)$/i;
const unitless=/^(?:aspectRatio|elevation|flex|flexGrow|flexShrink|fontWeight|opacity|order|scale|scaleX|scaleY|shadowOpacity|zIndex)$/;
function getPropertyName(name){return name.startsWith('--')?name:camelize(name);}
function fail(){throw Error('Invalid CSS value');}
function literal(value){
  if(/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?:px)?$/i.test(value))return parseFloat(value);
  switch(value.toLowerCase()){case 'true':return true;case 'false':return false;case 'null':return null;case 'undefined':return undefined;default:return value;}
}
function scalar(name,value){
  if(process.env.NODE_ENV!=='production') {
    if(numeric.test(value)&&Number(value)!==0&&!unitless.test(name))console.warn(`Expected style "${name}: ${value}" to contain units`);
    else if(/px$/i.test(value)&&numeric.test(value.slice(0,-2))&&Number(value.slice(0,-2))!==0&&unitless.test(name))console.warn(`Expected style "${name}: ${value}" to be unitless`);
  }
  return literal(value);
}
function tokens(value){return parse(value).nodes.filter(n=>n.type!=='space'&&n.type!=='comment');}
function word(n){if(n?.type!=='word')fail();return n.value;}
function number(n){const s=word(n);if(!numeric.test(s))fail();return Number(s);}
function readDimension(n,percent=false,auto=false){
  if(n?.type!=='word')return undefined;
  const s=n.value;
  if(auto&&s.toLowerCase()==='auto')return 'auto';
  const u=parse.unit(s);if(!u)return undefined;
  if(!u.unit)return Number(u.number)===0?0:undefined;
  if(percent&&u.unit==='%')return s;
  if(!lengthUnit.test(u.unit))return undefined;
  return u.unit.toLowerCase()==='px'?Number(u.number):s;
}
function dimension(n,percent=false,auto=false){const v=readDimension(n,percent,auto);return v===undefined?fail():v;}
function readColor(n){
  if(n?.type==='function'&&/^(?:rgb|rgba|hsl|hsla)$/i.test(n.value)&&!n.unclosed)return parse.stringify(n);
  if(n?.type==='word') {const s=n.value;if(Object.hasOwn(colors,s.toLowerCase())||s.toLowerCase()==='transparent'||/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(s))return s;}
}
function color(n){const v=readColor(n);return v===undefined?fail():v;}
const attempt=(fn,n)=>{const value=fn===color?readColor(n):readDimension(n);return value===undefined?null:{value};};
function count(ns,min,max=min){if(ns.length<min||ns.length>max)fail();}
function expand(name,ns){
  count(ns,1,4);const isColor=name==='borderColor',percent=name==='margin'||name==='padding'||name==='borderRadius'||name==='borderWidth';
  const a=ns.map(n=>isColor?color(n):dimension(n,percent,name==='margin'));
  const top=a[0],right=a[1]??top,bottom=a[2]??top,left=a[3]??right;
  switch(name){
    case 'margin':return {marginTop:top,marginRight:right,marginBottom:bottom,marginLeft:left};
    case 'padding':return {paddingTop:top,paddingRight:right,paddingBottom:bottom,paddingLeft:left};
    case 'borderWidth':return {borderTopWidth:top,borderRightWidth:right,borderBottomWidth:bottom,borderLeftWidth:left};
    case 'borderColor':return {borderTopColor:top,borderRightColor:right,borderBottomColor:bottom,borderLeftColor:left};
    case 'borderRadius':return {borderTopLeftRadius:top,borderTopRightRadius:right,borderBottomRightRadius:bottom,borderBottomLeftRadius:left};
  }
}
function unescapeCSS(value){return value.replace(/\\(?:([\da-f]{1,6})(?:\r\n|[\t\n\r\f ])?|([^\r\n\f]))/gi,(_,hex,letter)=>hex?String.fromCodePoint(parseInt(hex,16)||0xfffd):letter);}
function family(ns){
  if(ns.length===1&&ns[0].type==='string'&&!ns[0].unclosed)return unescapeCSS(ns[0].value);
  count(ns,1,Infinity);if(ns.some(n=>n.type!=='word'||!/^(?:-?[_a-z\\])(?:[\w\\-]*)$/i.test(n.value)))fail();
  return ns.map(n=>unescapeCSS(n.value)).join(' ');
}
function transformFunctions(ns){
  if(ns.length===1&&ns[0].value.toLowerCase()==='none')return [];
  count(ns,1,Infinity);const result=[];
  for(const n of ns){if(n.type!=='function'||n.unclosed)fail();const args=n.nodes.filter(x=>x.type!=='space'&&x.type!=='comment');
    for(let i=1;i<args.length;i+=2)if(args[i].type!=='div'||args[i].value!==',')fail();
    const a=args.filter((_,i)=>i%2===0);if(args.length!==a.length*2-1)fail();
    const name=n.value;
    const angle=x=>{const s=word(x),u=parse.unit(s);if(!u||!/^(deg|rad)$/i.test(u.unit))fail();return s.toLowerCase()};
    if(name==='scale'||name==='translate'||name==='skew'){
      count(a,1,2);const convert=name==='scale'?number:name==='translate'?x=>dimension(x):angle;
      if(name==='scale'&&a.length===1)result.push({scale:number(a[0])});
      else result.push({[name+'X']:convert(a[0])},{[name+'Y']:a[1]?convert(a[1]):name==='translate'?0:'0deg'});
    }else if(/^(?:scale[XY]|translate[XY]|skew[XY]|rotate[XYZ]?|perspective)$/.test(name)){
      count(a,1);result.push({[name]:name.startsWith('scale')?number(a[0]):/^(rotate|skew)/.test(name)?angle(a[0]):dimension(a[0])});
    }else fail();
  }
  return result.reverse();
}
function shorthand(name,ns){
  if(!ns.length) { const empty={border:{borderWidth:1,borderColor:'black',borderStyle:'solid'},flex:{flexGrow:1,flexShrink:1,flexBasis:0},flexFlow:{flexDirection:'row',flexWrap:'nowrap'},transform:{transform:[]},textDecoration:{textDecorationLine:'none',textDecorationStyle:'solid',textDecorationColor:'black'},textDecorationLine:{textDecorationLine:''}};if(Object.hasOwn(empty,name))return empty[name];fail(); }
  if(['margin','padding','borderWidth','borderRadius','borderColor'].includes(name))return expand(name,ns);
  if(name==='background'){count(ns,1);return {backgroundColor:color(ns[0])};}
  if(name==='fontFamily')return {fontFamily:family(ns)};
  if(name==='fontWeight'){count(ns,1);return {fontWeight:word(ns[0])};}
  if(name==='fontVariant'){const values=ns.map(word);if(values.some(s=>!/^-?[_a-z][\w-]*$/i.test(s)))fail();return {fontVariant:values};}
  if(name==='aspectRatio'){if(ns.length===1)return {aspectRatio:number(ns[0])};count(ns,3);if(ns[1].type!=='div'||ns[1].value!=='/')fail();return {aspectRatio:number(ns[0])/number(ns[2])};}
  if(name==='transform')return {transform:transformFunctions(ns)};
  if(name==='shadowOffset'||name==='textShadowOffset'){count(ns,1,2);return {[name]:{width:dimension(ns[0]),height:dimension(ns[1]||ns[0])}};}
  if(name==='border'){
    if(ns.length===1&&ns[0].type==='word'&&ns[0].value.toLowerCase()==='none')return {borderWidth:0,borderColor:'black',borderStyle:'solid'};
    count(ns,1,3);const r={borderWidth:1,borderColor:'black',borderStyle:'solid'},seen=new Set();
    for(const n of ns){let key,value;const col=attempt(color,n),len=attempt(dimension,n);
      if(col){key='borderColor';value=col.value;}else if(len){key='borderWidth';value=len.value;}else if(n.type==='word'&&/^(solid|dashed|dotted)$/i.test(n.value)){key='borderStyle';value=n.value.toLowerCase();}else fail();
      if(seen.has(key))fail();seen.add(key);r[key]=value;
    }return r;
  }
  if(name==='textShadow'||name==='boxShadow'){
    const prefix=name==='textShadow'?'textShadow':'shadow',lengths=[];if(ns.length===1&&ns[0].type==='word'&&ns[0].value.toLowerCase()==='none'){const r={[prefix+'Offset']:{width:0,height:0},[prefix+'Radius']:0,[prefix+'Color']:'black'};if(prefix==='shadow')r.shadowOpacity=1;return r;}let col='black',seenColor=false;
    for(const n of ns){const c=attempt(color,n);if(c){if(seenColor)fail();seenColor=true;col=c.value;}else lengths.push(dimension(n));}
    count(lengths,2,3);const r={[prefix+'Offset']:{width:lengths[0],height:lengths[1]},[prefix+'Radius']:lengths[2]??0,[prefix+'Color']:col};if(prefix==='shadow')r.shadowOpacity=1;return r;
  }
  if(name==='flexFlow'){
    count(ns,1,2);const r={flexDirection:'row',flexWrap:'nowrap'},seen=new Set();for(const n of ns){const s=word(n).toLowerCase(),key=/^(row|row-reverse|column|column-reverse)$/.test(s)?'flexDirection':/^(wrap|wrap-reverse|nowrap)$/.test(s)?'flexWrap':null;if(!key||seen.has(key))fail();seen.add(key);r[key]=s;}return r;
  }
  if(name==='flex'){
    count(ns,1,3);if(ns.length===1&&ns[0].value==='none')return {flexGrow:0,flexShrink:0,flexBasis:'auto'};
    let basis=0,seenBasis=false,firstNumber=-1;const nums=[];
    for(let i=0;i<ns.length;i++){const n=ns[i];if(n.type==='word'&&numeric.test(n.value)&&nums.length<2){if(firstNumber<0)firstNumber=i;else if(i!==firstNumber+1)fail();nums.push(number(n));}else {if(seenBasis)fail();basis=dimension(n,true,true);seenBasis=true;}}
    return {flexGrow:nums[0]??1,flexShrink:nums[1]??1,flexBasis:basis};
  }
  if(name==='placeContent'){
    count(ns,1,2);const align=word(ns[0]).toLowerCase(),justify=ns[1]?word(ns[1]).toLowerCase():'stretch';
    if(!/^(flex-start|flex-end|center|stretch|space-between|space-around)$/.test(align)||!/^(flex-start|flex-end|center|stretch|space-between|space-around|space-evenly)$/.test(justify))fail();return {alignContent:align,justifyContent:justify};
  }
  if(name==='textDecoration'||name==='textDecorationLine'){
    let style='solid',col='black',seenStyle=false,seenColor=false;const lines=new Set();
    for(const n of ns){const s=n.value.toLowerCase();if(n.type==='word'&&['none','underline','line-through'].includes(s)){if(lines.has(s))fail();lines.add(s);}
      else if(name==='textDecoration'&&n.type==='word'&&/^(solid|double|dotted|dashed)$/.test(s)){if(seenStyle)fail();seenStyle=true;style=s;}
      else if(name==='textDecoration'){if(seenColor)fail();seenColor=true;col=color(n);}else fail();}
    if(lines.has('none')&&lines.size>1)fail();const line=['underline','line-through'].filter(x=>lines.has(x)).join(' ')||'none';
    return name==='textDecorationLine'?{textDecorationLine:line}:{textDecorationLine:line,textDecorationStyle:style,textDecorationColor:col};
  }
  if(name==='font'){
    const r={fontStyle:'normal',fontWeight:'normal',fontVariant:[]},seen=new Set();let i=0;
    for(;i<ns.length;i++){const n=ns[i],s=n.value.toLowerCase();if(attempt(dimension,n))break;if(n.type!=='word')fail();if(s==='normal')continue;
      const k=/^(italic|oblique)$/.test(s)?'fontStyle':s==='small-caps'?'fontVariant':/^(bold|[1-9]00)$/.test(s)?'fontWeight':null;
      if(!k||seen.has(k))fail();seen.add(k);r[k]=k==='fontVariant'?[s]:s;
    }
    if(!ns[i])fail();r.fontSize=dimension(ns[i++]);if(ns[i]?.type==='div'&&ns[i].value==='/'){i++;r.lineHeight=dimension(ns[i++]);}r.fontFamily=family(ns.slice(i));return r;
  }
  return null;
}
const specialized=new Set(['margin','padding','borderWidth','borderRadius','borderColor','background','fontFamily','fontWeight','fontVariant','aspectRatio','transform','shadowOffset','textShadowOffset','border','textShadow','boxShadow','flexFlow','flex','placeContent','textDecoration','textDecorationLine','font']);
function getStylesForProperty(name,value,allowShorthand=true){
  value=value.trim();
  if(!allowShorthand||!specialized.has(name))return {[name]:scalar(name,value)};
  try{return shorthand(name,tokens(value));}catch{throw Error(`Failed to parse declaration "${name}: ${value}"`);}
}
function transform(styleTuples,shorthandBlacklist=[]){
  const result={};for(const [prop,value] of styleTuples){const name=getPropertyName(prop),styles=getStylesForProperty(name,value,!shorthandBlacklist.includes(name));
    // Define own keys, including __proto__, without invoking inherited setters.
    for(const key of Object.keys(styles)){if(key in result)Object.defineProperty(result,key,{value:styles[key],writable:true,enumerable:true,configurable:true});else result[key]=styles[key];}
  }return result;
}
Object.defineProperty(exports,'__esModule',{value:true});
exports.default=transform;exports.getPropertyName=getPropertyName;exports.getStylesForProperty=getStylesForProperty;
