'use strict';
// A declaration-only path silently falls through to installed npm Material in Bun.
// Keep that fallback present and poisonous so this check cannot pass by accident.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const dir=path.resolve(process.argv[2]),release=path.resolve(process.argv[3]),fallback=dir+'/node_modules/@mui/material';
assert.ok(!fs.existsSync(fallback),'Resolver test requires an isolated consumer');
const config=dir+'/tsconfig.json',probe=dir+'/resolver.mts',types=dir+'/resolver-types.mts';
assert.ok(!fs.existsSync(config));
try {
 fs.mkdirSync(fallback,{recursive:true});
 fs.writeFileSync(fallback+'/package.json',JSON.stringify({name:'@mui/material',type:'module',exports:{'.':'./fallback.mjs','./*':'./fallback.mjs'}}));
 fs.writeFileSync(fallback+'/fallback.mjs','throw Error("Bun incorrectly loaded npm Material");');
 fs.writeFileSync(config,JSON.stringify({compilerOptions:{strict:true,noEmit:true,skipLibCheck:false,types:[],target:'ES2022',module:'ESNext',moduleResolution:'Bundler',paths:JSON.parse(fs.readFileSync(release+'/tsconfig-paths.json'))},files:[types]}));
 fs.writeFileSync(types,`import type * as React from 'react';import type {InternalStandardProps} from '@mui/material/internal';import type {OverridableComponent} from '@mui/material/OverridableComponent';import type {TransitionProps} from '@mui/material/transitions';interface Timeline extends InternalStandardProps<React.HTMLAttributes<HTMLSpanElement>>{};const t:Timeline={className:'timeline',onClick:event=>event.currentTarget.focus()};const transition:TransitionProps={timeout:100};
// @ts-expect-error transition duration stays typed through mappings
const bad:TransitionProps={timeout:'100'};
declare const button:OverridableComponent<{props:{value:number};defaultComponent:'button'}>;button({value:1});
// @ts-expect-error required props stay typed through mappings
button({});`);
 fs.writeFileSync(probe,`import assert from 'node:assert/strict';import {Box as mapped,createSvgIcon} from '@mui/material';import {Box,createSvgIcon as ownIcon} from 'vmui-material';import MappedBox from '@mui/material/Box';import * as types from '@mui/material/OverridableComponent';import * as transitions from '@mui/material/transitions';assert.equal(mapped,Box);assert.equal(MappedBox,Box);assert.equal(createSvgIcon,ownIcon);assert.deepEqual(Object.keys(types),[]);assert.deepEqual(Object.keys(transitions),[]);console.log('Bun executable mappings bypass installed upstream Material; type-only entries resolve.');`);
 process.stdout.write(execFileSync('bun',[probe],{cwd:dir,encoding:'utf8'}));
 execFileSync('node',[require('../platform-types.cjs').compiler().path,'-p',config],{cwd:dir,encoding:'utf8'});
 console.log('TS resolves typed declarations from the same mappings Bun executes.');
} finally {fs.rmSync(fallback,{recursive:true,force:true});fs.rmSync(config,{force:true});fs.rmSync(probe,{force:true});fs.rmSync(types,{force:true})}
