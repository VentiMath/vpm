import Cookies from 'vjs-cookie';
const value:string|undefined=Cookies.get('value');
Cookies.withAttributes({secure:true}).set('x','y');
void value;
