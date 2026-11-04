'use client';
'use strict';
const React=require('react'),JSX=require('react/jsx-runtime');
function sameFields(left,right){
  const keys=Object.keys(left);
  return keys.length===Object.keys(right).length&&keys.every(key=>Object.hasOwn(right,key)&&Object.is(left[key],right[key]));
}
function useRecord(record){
  const saved=React.useRef(record);
  if(saved.current!==record&&!sameFields(saved.current,record))saved.current=record;
  return saved.current;
}
function pair(name,fallback,choose,scoped){
  function Provider(props){
    const {children,...fields}=props;
    const scope=scoped?fields.scope:undefined;
    if(scoped)delete fields.scope;
    const Context=choose(scope),value=useRecord(fields);
    return JSX.jsx(Context.Provider,{value,children});
  }
  Provider.displayName=name+'Provider';
  function read(consumer,scope,options){
    const value=React.useContext(choose(scope));
    if(value)return value;
    if(fallback!==undefined)return fallback;
    if(options?.optional)return;
    throw new Error(`\`${consumer}\` must be used within \`${name}\``);
  }
  return [Provider,scoped?read:(consumer,options)=>read(consumer,undefined,options)];
}
function context(name,fallback){const value=React.createContext(fallback);value.displayName=name+'Context';return value;}
function createContext(name,fallback){const base=context(name,fallback);return pair(name,fallback,()=>base,false);}
function createContextScope(name,dependencies=[]){
  const definitions=[];
  function scopedContext(component,fallback){
    const index=definitions.length,base=context(component,fallback);
    definitions.push({component,fallback});
    return pair(component,fallback,scope=>scope?.[name]?.[index]||base,true);
  }
  function createOwnScope(){
    const contexts=definitions.map(({component,fallback})=>context(component,fallback));
    return function useScope(override){
      const selected=override?.[name]||contexts;
      return React.useMemo(()=>({['__scope'+name]:{...override,[name]:selected}}),[override,selected]);
    };
  }
  const createScope=dependencies.length?function(){
    const factories=[{scopeName:name,create:createOwnScope},...dependencies.map(create=>({scopeName:create.scopeName,create}))];
    const hooks=factories.map(({scopeName,create})=>({scopeName,use:create()}));
    return function useComposedScope(override){
      let combined={};
      for(const item of hooks)combined={...combined,...item.use(override)['__scope'+item.scopeName]};
      const stable=useRecord(combined);
      return React.useMemo(()=>({['__scope'+name]:stable}),[stable]);
    };
  }:createOwnScope;
  createScope.scopeName=name;
  return [scopedContext,createScope];
}
module.exports={createContext,createContextScope};
