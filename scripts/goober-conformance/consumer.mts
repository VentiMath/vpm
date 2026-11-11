import {css, extractCss, type CSSObject, type StyleTarget} from 'vgoober';
const rules: CSSObject = {color:'red','@media (min-width:600px)':{display:'flex'},'&:hover':{opacity:.8}};
const name:string=css(rules,[{padding:0},false,null]);
const target:StyleTarget={data:''};css.bind({target})(rules);extractCss(target);
css.call({target:document.head},{color:'blue'});css.call({target:document.body.attachShadow({mode:'open'})},rules);
// @ts-expect-error raw template strings are outside the Notistack object-style scope
css('color:red');
// @ts-expect-error property values are not callbacks
css({color:()=> 'red'});
// @ts-expect-error styled is not shipped
import {styled} from 'vgoober';
void name;
