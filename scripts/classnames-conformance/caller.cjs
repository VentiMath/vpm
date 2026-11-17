'use strict';
process.env.NODE_ENV='production';
const assert=require('node:assert/strict');
const {AppStore,Redoc}=require('redoc'),React=require('react'),render=require('react-dom/server').renderToString;
const spec={"openapi": "3.0.3", "info": {"title": "Synthetic VentiMath API", "version": "1"}, "paths": {"/practice": {"get": {"summary": "Practice list", "tags": ["Practice"], "parameters": [{"name": "limit", "in": "query", "schema": {"type": "integer"}}], "responses": {"200": {"description": "Success", "content": {"application/json": {"schema": {"type": "array", "items": {"type": "object", "properties": {"id": {"type": "string"}, "title": {"type": "string"}}}}}}}}}}, "/practice/{id}": {"post": {"summary": "Save a practice result", "tags": ["Practice"], "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "string"}}], "responses": {"204": {"description": "Saved"}}}}}};
const store=new AppStore(spec,undefined,{disableSearch:true,hideDownloadButton:true},false);
const html=render(React.createElement(Redoc,{store}));const calls=globalThis.classnamesCalls;assert(calls>0,'Redoc must invoke the substituted helper');assert(html.includes('Practice list'));
process.stdout.write(JSON.stringify({html,calls}));
