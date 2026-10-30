'use strict';
exports.schema = {nested:{example:{nested:{
 State:{values:{UNKNOWN:0,READY:1}},
 Message:{fields:{id:{type:'int64',id:1},text:{type:'string',id:2},data:{type:'bytes',id:3},labels:{keyType:'string',type:'string',id:4},values:{type:'sint32',rule:'repeated',id:5},state:{type:'State',id:6},flag:{type:'bool',id:7},count:{type:'int32',id:8}},oneofs:{choice:{oneof:['flag','count']}},nested:{Nested:{fields:{value:{type:'string',id:1}}}}},
 Catalog:{methods:{GetDocument:{requestType:'Message',responseType:'Message'},ListDocuments:{requestType:'Message',responseType:'Message',responseStream:true},Upload:{requestType:'Message',responseType:'Message',requestStream:true},Chat:{requestType:'Message',responseType:'Message',requestStream:true,responseStream:true},Nested:{requestType:'Message.Nested',responseType:'Message.Nested'}}},
}}}};
exports.input = {id:'9223372036854775807',text:'é漢😀',data:Buffer.from([0,128,255]),labels:{hello:'world'},values:[-1,0,300],state:'READY',flag:true};
