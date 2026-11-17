import cn = require('../index.cjs');
import bind = require('../bind.cjs');
import dedupe = require('../dedupe.cjs');
const text:string=cn('button',{active:true},['compact'] as const);
bind.bind({active:'hash'})('active');
dedupe('button','button');
void text;
