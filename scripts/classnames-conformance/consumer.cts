import cn=require('vclassnames');import bind=require('vclassnames/bind');import dedupe=require('vclassnames/dedupe');
const result:string=cn('button',false,{active:true},['nested'] as const);
const bound=bind.bind({button:'hashed'});bound('button');dedupe('x','x');cn.default('x');
// @ts-expect-error symbols are outside the public class argument contract
cn(Symbol('unsupported'));
